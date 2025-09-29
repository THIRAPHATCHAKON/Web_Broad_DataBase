// โหลด dependencies และ models
const Report = require("./models/Report"); // MongoDB model สำหรับข้อมูลการรายงาน
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const multer = require("multer");                 
const { PrismaClient } = require("@prisma/client"); // ORM สำหรับ MySQL
const bcrypt = require("bcryptjs"); // เข้ารหัสรหัสผ่าน
const jwt = require("jsonwebtoken"); // สร้าง JWT token
const prisma = new PrismaClient();
const app = express();

// เชื่อมต่อ MongoDB สำหรับเก็บ reports
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/miniforum");

/* ---------- middlewares ---------- */
// อนุญาติ CORS จาก frontend
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5174"], credentials: true })); 
app.use(express.json()); // parse JSON body
app.use(cookieParser()); // parse cookies

// เสิร์ฟไฟล์ static (รูปภาพ, avatar ฯลฯ)
app.use("/static", express.static(path.join(__dirname, "../static")));

/* ---------- upload (multer) ---------- */
// สร้างโฟลเดอร์สำหรับอัปโหลดไฟล์
const uploadDirs = {
  thread: path.join(__dirname, "../static/thread_images"),
  avatar: path.join(__dirname, "../static/avatars")
};
Object.values(uploadDirs).forEach(dir => fs.mkdirSync(dir, { recursive: true }));

// ตั้งค่า multer สำหรับอัปโหลดรูปกระทู้
const threadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDirs.thread),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `thread-${Date.now()}${ext}`);
  }
});

// ตั้งค่า multer สำหรับอัปโหลด avatar
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDirs.avatar),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${Date.now()}${ext}`);
  }
});

// สร้าง multer instances
const uploadThread = multer({ storage: threadStorage });
const uploadAvatar = multer({ storage: avatarStorage });

/* ---------- health ---------- */
// API ตรวจสอบสถานะเซิร์ฟเวอร์
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

/* ---------- auth ---------- */
// API สมัครสมาชิกใหม่ - รับ username, email, password แล้วสร้าง user ใหม่
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!username || !email || !password) {
      return res.status(400).json({ ok: false, message: "ข้อมูลไม่ครบ" });
    }
    // ตรวจสอบความยาวรหัสผ่าน
    if (password.length < 6) {
      return res.status(400).json({ ok: false, message: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" });
    }

    // เข้ารหัสรหัสผ่าน
    const passHash = await bcrypt.hash(password, 10);
    // สร้าง user ใหม่ในฐานข้อมูล
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passHash,
        role: "user", // ตั้งค่า role เริ่มต้นเป็น user
        avatarUrl: "/static/avatars/default.png", // avatar เริ่มต้น
      },
      select: { id: true, username: true, email: true, role: true, avatarUrl: true },
    });

    return res.json({ ok: true, message: "สมัครสำเร็จ", user });
  } catch (err) {
    // จัดการ error ข้อมูลซ้ำ (unique constraint)
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0] || "ข้อมูล";
      return res.status(409).json({ ok: false, message: `${field} นี้ถูกใช้แล้ว` });
    }
    console.error(err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});

// API เข้าสู่ระบบ - รับ username, password แล้วคืน JWT token
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  // ค้นหา user จาก username (ใช้ findFirst เพราะ username อาจไม่ unique)
  const user = await prisma.user.findFirst({ where: { username } });
  if (!user) return res.status(401).json({ ok: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });

  // ตรวจสอบรหัสผ่าน
  const ok = await bcrypt.compare(password, user.passHash);
  if (!ok) return res.status(401).json({ ok: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });

  // สร้าง JWT token พร้อมข้อมูล user
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "changeme",
    { expiresIn: "7d" }
  );

  // ส่งข้อมูล user และ token กลับไป
  res.json({
    ok: true,
    redirectTo: "/thread",
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
      avatarUrl: user.avatarUrl || "/static/avatars/default.png",
      bio: user.bio || "",
      socialLink: user.socialLink || "",
      token
    },
  });
});

/* ---------- threads ---------- */
// API ดึงรายการกระทู้ทั้งหมด หรือกรองตามหมวดหมู่
app.get("/api/threads", async (req, res) => {
  // กรองตามหมวดหมู่ถ้ามี query parameter
  const categoryId = req.query.category ? parseInt(req.query.category, 10) : null;
  const where = categoryId ? { categoryId } : {};

  // ดึงกระทู้พร้อมข้อมูลผู้เขียน เรียงตามวันที่สร้างล่าสุด
  const items = await prisma.thread.findMany({
    where,
    include: { author: { select: { id: true, email: true, username: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ ok: true, items });
});

// API สร้างกระทู้ใหม่ - รับข้อมูลกระทู้ + รูปภาพ (optional)
app.post("/api/threads", uploadThread.single("cover"), async (req, res) => {
  const { title, body, tags, categoryId } = req.body;
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, "") || "";
  try {
    // ตรวจสอบข้อมูลที่จำเป็น
    const userId = parseInt(req.body.userId, 10);
    const catId = categoryId ? parseInt(categoryId, 10) : null;
    if (!title?.trim() || !body?.trim() || Number.isNaN(userId) || !catId) {
      return res.status(400).json({ ok: false, message: "invalid input" });
    }

    // สร้างกระทู้ใหม่พร้อม cover image (ถ้ามี)
    const thread = await prisma.thread.create({
      data: {
        title: title.trim(),
        body: body.trim(),
        tags: tags?.trim() || null,
        authorId: userId,
        coverUrl: req.file ? `/static/thread_images/${req.file.filename}` : null,
        categoryId: catId
      },
      include: {
        author: {
          select: { id: true, username: true, email: true, avatarUrl: true }
        }
      }
    });

    res.json({ ok: true, thread });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "สร้างกระทู้ไม่สำเร็จ" });
  }
});

/* ---------- serve React build (production) ---------- */
// เสิร์ฟไฟล์ static จาก React build (production mode)
const distPath = path.join(__dirname, "../../client/dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // จัดการ client-side routing (SPA)
  app.get("/*", (req, res) => {
    if (req.path.startsWith("/api/")) return res.status(404).end();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// API ดึงข้อมูลกระทู้ตาม ID พร้อมข้อมูลผู้เขียน
app.get("/api/threads/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ ok: false, message: "bad id" });

  // ค้นหากระทู้ตาม ID พร้อมข้อมูลผู้เขียน
  const t = await prisma.thread.findUnique({
    where: { id },
    include: { author: { select: { id: true, email: true, username: true, avatarUrl: true } } },
  });
  if (!t) return res.status(404).json({ ok: false, message: "not found" });

  res.json({ ok: true, thread: t });
});

// API ลบกระทู้ - เฉพาะเจ้าของหรือ admin เท่านั้น
app.delete("/api/threads/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let user = null;
  try {
    // ตรวจสอบ JWT token
    user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }

  // ตรวจสอบว่ากระทู้มีอยู่จริง
  const thread = await prisma.thread.findUnique({ where: { id } });
  if (!thread) return res.status(404).json({ ok: false, message: "not found" });

  // ตรวจสอบสิทธิ์ (เจ้าของหรือ admin เท่านั้น)
  if (thread.authorId !== user.id && user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "no permission" });
  }

  // ลบคอมเมนต์ทั้งหมดของกระทู้นี้ก่อน
  await prisma.comment.deleteMany({ where: { threadId: id } });
  // แล้วค่อยลบกระทู้
  await prisma.thread.delete({ where: { id } });
  res.json({ ok: true });
});

// API ดึงคอมเมนต์ทั้งหมดของกระทู้
app.get("/api/threads/:id/comments", async (req, res) => {
  const threadId = parseInt(req.params.id, 10);
  if (Number.isNaN(threadId)) return res.status(400).json({ ok: false, message: "bad id" });

  // ตรวจสอบว่ากระทู้มีอยู่จริง
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) return res.status(404).json({ ok: false, message: "ไม่พบกระทู้" });

  // ดึงคอมเมนต์ทั้งหมดพร้อมข้อมูลผู้เขียน เรียงตามวันที่สร้าง
  const items = await prisma.comment.findMany({
    where: { threadId },
    include: { author: { select: { id: true, username: true, email: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  res.json({ ok: true, items });
});

// API สร้างคอมเมนต์ใหม่ในกระทู้
app.post("/api/threads/:id/comments", async (req, res) => {
  const threadId = parseInt(req.params.id, 10);
  const { body, authorId } = req.body || {};
  // ตรวจสอบข้อมูลที่จำเป็น
  if (!body || !authorId) {
    return res.status(400).json({ ok: false, message: "ข้อมูลไม่ครบ" });
  }
  // ตรวจสอบว่ากระทู้มีอยู่จริง
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) return res.status(404).json({ ok: false, message: "ไม่พบกระทู้" });

  // สร้างคอมเมนต์ใหม่พร้อมข้อมูลผู้เขียน
  const created = await prisma.comment.create({
    data: {
      body: body.trim(),
      threadId,
      authorId: parseInt(authorId, 10),
    },
    include: {
      author: { select: { id: true, username: true, email: true, avatarUrl: true } }
    }
  });

  res.json({ ok: true, comment: created });
});

/* ---------- users ---------- */
// API อัปเดตข้อมูลผู้ใช้ - username, bio, socialLink, avatar
app.patch("/api/users/:id", uploadAvatar.single("avatar"), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { username, bio, socialLink } = req.body;

  try {
    let avatarUrl = undefined;
    // ถ้ามีการอัปโหลด avatar ใหม่
    if (req.file) {
      avatarUrl = `/static/avatars/${req.file.filename}`;
    }

    // อัปเดตข้อมูล user (เฉพาะฟิลด์ที่ส่งมา)
    const user = await prisma.user.update({
      where: { id },
      data: {
        username: username || undefined,
        avatarUrl: avatarUrl || undefined,
        bio: bio || undefined,
        socialLink: socialLink || undefined
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        role: true,
        bio: true,
        socialLink: true
      }
    });

    res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "อัพเดตไม่สำเร็จ" });
  }
});

// API เปลี่ยนรหัสผ่าน - ต้องใส่รหัสเดิมก่อน
app.post("/api/users/:id/change-password", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { oldPassword, newPassword } = req.body || {};

  // ตรวจสอบข้อมูลที่จำเป็น
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ ok: false, message: "ข้อมูลไม่ครบ" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ ok: false, message: "รหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร" });
  }

  // ตรวจสอบว่า user มีอยู่จริง
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ ok: false, message: "ไม่พบผู้ใช้" });

  // ตรวจสอบรหัสผ่านเดิม
  const ok = await bcrypt.compare(oldPassword, user.passHash);
  if (!ok) return res.status(401).json({ ok: false, message: "รหัสผ่านเดิมไม่ถูกต้อง" });

  // เข้ารหัสรหัสผ่านใหม่และอัปเดต
  const passHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id }, data: { passHash } });

  res.json({ ok: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" });
});

// API ดึงรายการผู้ใช้ทั้งหมด - เฉพาะ admin
app.get("/api/users", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let user = null;
  try {
    // ตรวจสอบ JWT token
    user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
  // ตรวจสอบว่าเป็น admin
  if (user.role !== "admin") return res.status(403).json({ ok: false, message: "forbidden" });

  // ดึงรายการ user ทั้งหมด (ไม่รวม password hash)
  const users = await prisma.user.findMany({
    select: { id: true, email: true, username: true, role: true }
  });
  res.json({ ok: true, users });
});

// API เปลี่ยน role ของผู้ใช้ (user/admin) - เฉพาะ admin
app.patch("/api/users/:id/role", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let user = null;
  try {
    // ตรวจสอบ JWT token
    user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
  // ตรวจสอบว่าเป็น admin
  if (user.role !== "admin") return res.status(403).json({ ok: false, message: "forbidden" });

  const id = parseInt(req.params.id, 10);
  const { role } = req.body;
  // ตรวจสอบว่า role ถูกต้อง
  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({ ok: false, message: "role ไม่ถูกต้อง" });
  }

  try {
    // อัปเดต role ของ user
    await prisma.user.update({
      where: { id },
      data: { role }
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "เปลี่ยน role ไม่สำเร็จ" });
  }
});

/* ---------- categories ---------- */
// API ดึงรายการหมวดหมู่ทั้งหมด
app.get("/api/categories", async (req, res) => {
  // ดึงหมวดหมู่ทั้งหมดเรียงตามชื่อ
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  res.json(categories);
});

// API สร้างหมวดหมู่ใหม่ - เฉพาะ admin
app.post("/api/categories", auth, async (req, res) => {
  console.log("BODY", req.body, "USER", req.user);
  // ตรวจสอบว่าเป็น admin
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "forbidden" });
  }
  const { name } = req.body;
  if (!name) return res.status(400).json({ ok: false, message: "ต้องระบุชื่อหมวดหมู่" });
  // สร้างหมวดหมู่ใหม่
  const cat = await prisma.category.create({ data: { name } });
  res.json({ ok: true, category: cat });
});

// API ลบหมวดหมู่ - เฉพาะ admin
app.delete("/api/categories/:id", auth, async (req, res) => {
  // ตรวจสอบว่าเป็น admin
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "forbidden" });
  }
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ ok: false, message: "bad id" });

  try {
    // ลบหมวดหมู่ (กระทู้ที่ใช้หมวดหมู่นี้จะ set categoryId เป็น null อัตโนมัติ)
    await prisma.category.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "ลบหมวดหมู่ไม่สำเร็จ" });
  }
});

/* ---------- reports ---------- */
// API รายงานกระทู้ - บันทึกข้อมูลการรายงานลง MongoDB
app.post("/api/reports", async (req, res) => {
  const { threadId, threadTitle, reason } = req.body;
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let user = null;
  try {
    // ตรวจสอบ JWT token
    user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
  if (!threadId || !reason) return res.status(400).json({ ok: false, message: "ข้อมูลไม่ครบ" });
  
  // บันทึกรายงานลง MongoDB
  const report = await Report.create({
    threadId,
    threadTitle,
    reporterId: user.id,
    reporterEmail: user.email,
    reason
  });
  res.json({ ok: true, report });
});

// API ดึงรายการรายงานทั้งหมด - เฉพาะ admin
app.get("/api/reports", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let user = null;
  try {
    // ตรวจสอบ JWT token
    user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
  // ตรวจสอบว่าเป็น admin
  if (user.role !== "admin") return res.status(403).json({ ok: false, message: "forbidden" });
  
  // ดึงรายงานทั้งหมดจาก MongoDB เรียงตามวันที่ล่าสุด
  const reports = await Report.find().sort({ createdAt: -1 });
  res.json({ ok: true, reports });
});

// API แก้ไขรายงาน - เฉพาะ admin
app.put("/api/reports/:id", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let user = null;
  try {
    // ตรวจสอบ JWT token
    user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
  // ตรวจสอบว่าเป็น admin
  if (user.role !== "admin") return res.status(403).json({ ok: false, message: "forbidden" });

  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ ok: false, message: "ต้องระบุเหตุผลในการรายงาน" });
  }

  try {
    // อัปเดตรายงานใน MongoDB
    const report = await Report.findByIdAndUpdate(
      req.params.id, 
      { reason: reason.trim() }, 
      { new: true }
    );
    
    if (!report) {
      return res.status(404).json({ ok: false, message: "ไม่พบรายงาน" });
    }

    res.json({ ok: true, report });
  } catch (error) {
    console.error("Error updating report:", error);
    res.status(500).json({ ok: false, message: "แก้ไขรายงานไม่สำเร็จ" });
  }
});

// API ลบรายงาน - เฉพาะ admin
app.delete("/api/reports/:id", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let user = null;
  try {
    // ตรวจสอบ JWT token
    user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
  // ตรวจสอบว่าเป็น admin
  if (user.role !== "admin") return res.status(403).json({ ok: false, message: "forbidden" });

  try {
    // ลบรายงานจาก MongoDB
    const report = await Report.findByIdAndDelete(req.params.id);
    
    if (!report) {
      return res.status(404).json({ ok: false, message: "ไม่พบรายงาน" });
    }

    res.json({ ok: true, message: "ลบรายงานสำเร็จ" });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ ok: false, message: "ลบรายงานไม่สำเร็จ" });
  }
});

/* ---------- admin ---------- */
// API ดึงข้อมูล dashboard สำหรับ admin - สถิติต่างๆ
app.get("/api/admin/dashboard", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let user = null;
  try {
    // ตรวจสอบ JWT token
    user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
  // ตรวจสอบว่าเป็น admin
  if (user.role !== "admin") return res.status(403).json({ ok: false, message: "forbidden" });

  // นับจำนวน user ทั้งหมด
  const userCount = await prisma.user.count();
  // นับจำนวนกระทู้ทั้งหมด
  const threadCount = await prisma.thread.count();

  // สถิติผู้ใช้ใหม่ในแต่ละวัน (7 วันล่าสุด)
  const users = await prisma.user.findMany({
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 100, // เพิ่มจำนวนเพื่อให้ครอบคลุม 7 วันล่าสุด
  });

  // จัดกลุ่มผู้ใช้ตามวันที่
  const dailyUsersMap = new Map();
  users.forEach(user => {
    const date = user.createdAt.toISOString().slice(0, 10);
    dailyUsersMap.set(date, (dailyUsersMap.get(date) || 0) + 1);
  });

  // แปลงเป็น array และเรียงตามวันที่ล่าสุด แล้วเอาแค่ 7 วันล่าสุด
  const dailyUsers = Array.from(dailyUsersMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  res.json({
    ok: true,
    userCount,
    threadCount,
    dailyUsers
  });
});

// API รีเซ็ตรหัสผ่าน - รับ email และรหัสผ่านใหม่
app.post("/api/forgot-password", async (req, res) => {
  const email = req.body.email;
  const newPassword = req.body.newPassword;
  // ตรวจสอบข้อมูลที่จำเป็น
  if (!email || !newPassword) {
    return res.status(400).json({ ok: false, message: "ข้อมูลไม่ครบ" });
  }

  // ค้นหา user จาก email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ ok: false, message: "ไม่พบผู้ใช้" });
  
  // เข้ารหัสรหัสผ่านใหม่และอัปเดต
  const passHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { email }, data: { passHash } });

  res.json({ ok: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" });
});

// ฟังก์ชันตรวจสอบ JWT token สำหรับ middleware
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ ok: false, message: "No token" });
  const token = authHeader.split(" ")[1]; // Bearer <token>
  try {
    // ตรวจสอบและ decode JWT token
    req.user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
    next(); // ไปยัง middleware/route ต่อไป
  } catch (e) {
    res.status(401).json({ ok: false, message: "Invalid token" });
  }
}

// เริ่มเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
