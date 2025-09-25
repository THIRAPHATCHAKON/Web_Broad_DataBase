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
const uploadDir = path.join(__dirname, "../static/thread_images");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const name = Date.now() + "-" + Math.random().toString(16).slice(2) + ext;
    cb(null, name);
  },
});
const upload = multer({ storage });

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
app.post("/api/threads", upload.single("image"), async (req, res) => {
  try {
    const { title, body, tags, authorId } = req.body || {};
    if (!title || !body) {
      return res.status(400).json({ ok: false, message: "กรอกหัวข้อและรายละเอียด" });
    }

    // ปกติ authorId ควรอ่านจาก token/cookie; ที่นี่รับจาก body ชั่วคราว
    const authorIdNum = parseInt(authorId, 10);
    if (Number.isNaN(authorIdNum)) {
      return res.status(400).json({ ok: false, message: "authorId ไม่ถูกต้อง" });
    }

    const coverUrl = req.file ? `/static/thread_images/${req.file.filename}` : null;

    const thread = await prisma.thread.create({
      data: {
        title: title.trim(),
        body: body.trim(),
        tags: (tags || "").trim(),   // เช่น "react,bootstrap"
        coverUrl,
        authorId: authorIdNum,
      },
      select: { id: true, title: true, coverUrl: true, createdAt: true },
    });

    res.json({ ok: true, thread });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: "server error" });
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


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
