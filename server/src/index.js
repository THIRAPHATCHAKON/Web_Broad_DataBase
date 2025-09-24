const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173", credentials: true })); // ถ้าเรียกจาก Vite
app.use(cookieParser());
// ---- API ก่อน ----
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ---- เสิร์ฟ React build (เฉพาะตอนมี dist) ----
const distPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));


  // ✅ ใช้ '/*' หรือใช้ app.use แทน
  app.get('/*', (req, res) => {
    // กันไม่ให้ทับเส้นทาง /api/*
    if (req.path.startsWith('/api/')) return res.status(404).end();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}


app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" });
    }

    const passHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username, email, passHash, role: "user" },
      select: { id: true, username: true, email: true, role: true }
    });

    // แบบ A: ส่งข้อความแล้วให้ไป login เอง
    return res.json({ ok: true, message: "สมัครสำเร็จ", user });

    // แบบ B: ออก token ให้เลย (ถ้าต้องการ)
    // const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "2h" });
    // return res.json({ ok: true, user, token });

  } catch (err) {
    // จัดการกรณีซ้ำ (unique) ของ Prisma
    // P2002 = Unique constraint failed
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0] || "ข้อมูล";
      return res.status(409).json({ message: `${field} นี้ถูกใช้แล้ว` });
    }
    console.error(err);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

// ล็อกอิน
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ ok: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });

  const ok = await bcrypt.compare(password, user.passHash);
  if (!ok) return res.status(401).json({ ok: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });

  res.json({
    ok: true,
    redirectTo: "/thread",
    user: { id: user.id, email: user.email, role: user.role }
  });
});

// thread ตัวอย่าง
app.get("/api/threads", async (_req, res) => {
  const items = await prisma.thread.findMany({
    include: { author: { select: { id: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ ok: true, items });
});

app.post("/api/threads", async (req, res) => {
  const { title, body, authorId } = req.body || {};
  const t = await prisma.thread.create({ data: { title, body, authorId } });
  res.json({ ok: true, thread: t });
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server on http://localhost:' + PORT));
