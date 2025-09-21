// server/src/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');

const app = express();
app.use(cors());
app.use(express.json());
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

// server/src/index.js (หรือใน routes แยกไฟล์)
app.get('/api/profile', (req, res) => {
  res.json({ name: 'Kepin', role: 'user' })
})

app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  if (email === "admin@example.com" && password === "123456") {
    // เดโม่: ส่ง token/ตั้งคุกกี้เซสชันตามต้องการ
    // res.cookie("sid", "mock-session-id", { httpOnly: true, sameSite: "lax" });
    console.log("login success");
    return res.json({ ok: true, redirectTo: "/Thread" })
  }
  console.log("login fali");
  return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server on http://localhost:' + PORT));
