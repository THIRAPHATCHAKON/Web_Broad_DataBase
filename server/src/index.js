// server/src/index.js  (CommonJS)
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const multer = require("multer");                 // 👈 ต้องมี
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const app = express();

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

  res.json({
    ok: true,
    redirectTo: "/thread",
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
      avatarUrl: user.avatarUrl || "/static/avatars/default.png",
    },
  });
});

/* ---------- threads ---------- */
// GET list
app.get("/api/threads", async (_req, res) => {
  const items = await prisma.thread.findMany({
    include: { author: { select: { id: true, email: true, username: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ ok: true, items });
});

// POST create (รองรับ multipart + รูป optional)
// ฟิลด์ text: title, body, tags, authorId
app.post("/api/threads", uploadThread.single("cover"), async (req, res) => {
  const { title, body, tags } = req.body;
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, "") || "";
  try {
    const userId = parseInt(req.body.userId, 10);
    if (!title?.trim() || !body?.trim() || Number.isNaN(userId)) {
      return res.status(400).json({ ok: false, message: "invalid input" });
    }

    const thread = await prisma.thread.create({
      data: {
        title: title.trim(),
        body: body.trim(),
        tags: tags?.trim() || null,
        authorId: userId,
        coverUrl: req.file ? `/static/thread_images/${req.file.filename}` : null
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
  const userId = parseInt(req.query.userId, 10);

  if (Number.isNaN(id) || Number.isNaN(userId)) {
    return res.status(400).json({ ok: false, message: "bad id" });
  }

  const thread = await prisma.thread.findUnique({ where: { id } });
  if (!thread) return res.status(404).json({ ok: false, message: "not found" });
  if (thread.authorId !== userId) {
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
  const { username } = req.body;

  try {
    let avatarUrl = undefined;
    if (req.file) {
      avatarUrl = `/static/avatars/${req.file.filename}`;
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        username: username || undefined,
        avatarUrl: avatarUrl || undefined
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        role: true
      }
    });

    res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "อัพเดตไม่สำเร็จ" });
  }
});

// PATCH user profile
app.patch("/api/users/:id", uploadAvatar.single("avatar"), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { username } = req.body;

  try {
    let avatarUrl = undefined;
    if (req.file) {
      avatarUrl = `/static/avatars/${req.file.filename}`;
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        username: username || undefined,
        avatarUrl: avatarUrl || undefined
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        role: true
      }
    });

    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, message: "อัพเดตไม่สำเร็จ" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
