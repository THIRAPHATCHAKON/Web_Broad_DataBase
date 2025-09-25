// server/src/index.js  (CommonJS)
const Report = require("./models/Report");
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const multer = require("multer");                 // 👈 ต้องมี
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = new PrismaClient();
const app = express();

const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/miniforum");
/* ---------- middlewares ---------- */
app.use(cors({ origin: "http://localhost:5173", credentials: true })); // ให้ตัวเดียวพอ
app.use(express.json());
app.use(cookieParser());

// เสิร์ฟไฟล์จาก server/static -> /static/**
app.use("/static", express.static(path.join(__dirname, "../static")));

/* ---------- upload (multer) ---------- */
const uploadDirs = {
  thread: path.join(__dirname, "../static/thread_images"),
  avatar: path.join(__dirname, "../static/avatars")
};
Object.values(uploadDirs).forEach(dir => fs.mkdirSync(dir, { recursive: true }));

const threadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDirs.thread),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `thread-${Date.now()}${ext}`);
  }
});


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
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

/* ---------- auth ---------- */
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ ok: false, message: "ข้อมูลไม่ครบ" });
    }
    if (password.length < 6) {
      return res.status(400).json({ ok: false, message: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" });
    }

    const passHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passHash,
        role: "user",
        // ถ้าตั้ง default ไว้ใน schema ก็ไม่ต้องส่งฟิลด์นี้
        avatarUrl: "/static/avatars/default.png",
      },
      select: { id: true, username: true, email: true, role: true, avatarUrl: true },
    });

    return res.json({ ok: true, message: "สมัครสำเร็จ", user });
  } catch (err) {
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0] || "ข้อมูล";
      return res.status(409).json({ ok: false, message: `${field} นี้ถูกใช้แล้ว` });
    }
    console.error(err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ ok: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });

  const ok = await bcrypt.compare(password, user.passHash);
  if (!ok) return res.status(401).json({ ok: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });

  // สร้าง JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "changeme",
    { expiresIn: "7d" }
  );

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
      token // <<--- ส่ง token กลับไปด้วย
    },
  });
});

/* ---------- threads ---------- */
// GET list
app.get("/api/threads", async (req, res) => {
  const categoryId = req.query.category ? parseInt(req.query.category, 10) : null;
  const where = categoryId ? { categoryId } : {};

  const items = await prisma.thread.findMany({
    where,
    include: { author: { select: { id: true, email: true, username: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ ok: true, items });
});

// POST create (รองรับ multipart + รูป optional)
// ฟิลด์ text: title, body, tags, authorId
app.post("/api/threads", uploadThread.single("cover"), async (req, res) => {
  const { title, body, tags, categoryId } = req.body;
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, "") || "";
  try {
    const userId = parseInt(req.body.userId, 10);
    const catId = categoryId ? parseInt(categoryId, 10) : null;
    if (!title?.trim() || !body?.trim() || Number.isNaN(userId) || !catId) {
      return res.status(400).json({ ok: false, message: "invalid input" });
    }

    const thread = await prisma.thread.create({
      data: {
        title: title.trim(),
        body: body.trim(),
        tags: tags?.trim() || null,
        authorId: userId,
        coverUrl: req.file ? `/static/thread_images/${req.file.filename}` : null,
        categoryId: catId // <<--- เพิ่มตรงนี้
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

/* ---------- serve React build (ถ้ามี) ---------- */
const distPath = path.join(__dirname, "../../client/dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("/*", (req, res) => {
    if (req.path.startsWith("/api/")) return res.status(404).end();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// server/src/index.js
app.get("/api/threads/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ ok:false, message:"bad id" });

  const t = await prisma.thread.findUnique({
    where: { id },
    include: { author: { select: { id: true, email: true, username: true, avatarUrl: true } } },
  });
  if (!t) return res.status(404).json({ ok:false, message:"not found" });

  res.json({ ok: true, thread: t });
});

app.delete("/api/threads/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let user = null;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }

  const thread = await prisma.thread.findUnique({ where: { id } });
  if (!thread) return res.status(404).json({ ok: false, message: "not found" });

  // อนุญาตเฉพาะเจ้าของ หรือ admin
  if (thread.authorId !== user.id && user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "no permission" });
  }

  // ลบคอมเมนต์ทั้งหมดของกระทู้นี้ก่อน
  await prisma.comment.deleteMany({ where: { threadId: id } });

  // แล้วค่อยลบกระทู้
  await prisma.thread.delete({ where: { id } });
  res.json({ ok: true });
});

// GET comments ของกระทู้นั้น
app.get("/api/threads/:id/comments", async (req, res) => {
  const threadId = parseInt(req.params.id, 10);
  if (Number.isNaN(threadId)) return res.status(400).json({ ok: false, message: "bad id" });

  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) return res.status(404).json({ ok: false, message: "ไม่พบกระทู้" });

  const items = await prisma.comment.findMany({
    where: { threadId },
    include: { author: { select: { id: true, username: true, email: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  res.json({ ok: true, items });
});

// POST comment -> คืน comment พร้อมข้อมูล author
app.post("/api/threads/:id/comments", async (req, res) => {
  const threadId = parseInt(req.params.id, 10);
  const { body, authorId } = req.body || {};
  if (!body || !authorId) {
    return res.status(400).json({ ok: false, message: "ข้อมูลไม่ครบ" });
  }
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) return res.status(404).json({ ok: false, message: "ไม่พบกระทู้" });

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

app.patch("/api/users/:id", uploadAvatar.single("avatar"), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { username, bio, socialLink } = req.body;

  try {
    let avatarUrl = undefined;
    if (req.file) {
      avatarUrl = `/static/avatars/${req.file.filename}`;
    }

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

app.post("/api/users/:id/change-password", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { oldPassword, newPassword } = req.body || {};

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ ok: false, message: "ข้อมูลไม่ครบ" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ ok: false, message: "รหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร" });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ ok: false, message: "ไม่พบผู้ใช้" });

  const ok = await bcrypt.compare(oldPassword, user.passHash);
  if (!ok) return res.status(401).json({ ok: false, message: "รหัสผ่านเดิมไม่ถูกต้อง" });

  const passHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id }, data: { passHash } });

  res.json({ ok: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" });
});

app.get("/api/categories", async (req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  res.json(categories);
});

app.post("/api/categories", auth, async (req, res) => {
  console.log("BODY", req.body, "USER", req.user);
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "forbidden" });
  }
  const { name } = req.body;
  if (!name) return res.status(400).json({ ok: false, message: "ต้องระบุชื่อหมวดหมู่" });
  const cat = await prisma.category.create({ data: { name } });
  res.json({ ok: true, category: cat });
});

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ ok: false, message: "No token" });
  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
    next();
  } catch (e) {
    res.status(401).json({ ok: false, message: "Invalid token" });
  }
}

app.delete("/api/categories/:id", auth, async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ ok: false, message: "forbidden" });
  }
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ ok: false, message: "bad id" });

  try {
    // ลบหมวดหมู่ ถ้ามี thread ที่ใช้ categoryId นี้ จะ set เป็น null อัตโนมัติ (ถ้า schema ถูกต้อง)
    await prisma.category.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "ลบหมวดหมู่ไม่สำเร็จ" });
  }
});

app.post("/api/reports", async (req, res) => {
  const { threadId, threadTitle, reason } = req.body;
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let user = null;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
  if (!threadId || !reason) return res.status(400).json({ ok: false, message: "ข้อมูลไม่ครบ" });
  const report = await Report.create({
    threadId,
    threadTitle,
    reporterId: user.id,
    reporterEmail: user.email,
    reason
  });
  res.json({ ok: true, report });
});

app.get("/api/reports", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let user = null;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
  if (user.role !== "admin") return res.status(403).json({ ok: false, message: "forbidden" });
  const reports = await Report.find().sort({ createdAt: -1 });
  res.json({ ok: true, reports });
});

app.get("/api/users", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let user = null;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
  if (user.role !== "admin") return res.status(403).json({ ok: false, message: "forbidden" });

  // ดึง user ทั้งหมดจากฐานข้อมูล (เช่น Prisma)
  const users = await prisma.user.findMany({
    select: { id: true, email: true, username: true, role: true }
  });
  res.json({ ok: true, users });
});

app.patch("/api/users/:id/role", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let user = null;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
  if (user.role !== "admin") return res.status(403).json({ ok: false, message: "forbidden" });

  const id = parseInt(req.params.id, 10);
  const { role } = req.body;
  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({ ok: false, message: "role ไม่ถูกต้อง" });
  }

  try {
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


app.get("/api/admin/dashboard", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let user = null;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
  if (user.role !== "admin") return res.status(403).json({ ok: false, message: "forbidden" });

  // จำนวน user ทั้งหมด
  const userCount = await prisma.user.count();
  // จำนวนกระทู้ทั้งหมด
  const threadCount = await prisma.thread.count();

  // ตัวอย่าง: สถิติคนเข้าแต่ละวัน (mock, ถ้าไม่มีตาราง log จริง)
  // ถ้ามีตาราง log จริง ให้ query จาก log table
  // ตัวอย่างนี้นับ user ที่สมัครใหม่ในแต่ละวัน 7 วันล่าสุด
  const dailyUsers = await prisma.user.groupBy({
    by: ['createdAt'],
    _count: { id: true },
    orderBy: { createdAt: 'desc' },
    take: 7,
  });

  res.json({
    ok: true,
    userCount,
    threadCount,
    dailyUsers: dailyUsers.map(d => ({
      date: d.createdAt.toISOString().slice(0, 10),
      count: d._count.id
    }))
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
