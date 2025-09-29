/*
 * ==================================================================================
 * WEB BOARD DATABASE - BACKEND SERVER
 * ==================================================================================
 * 
 * 📋 คำอธิบาย: เซิร์ฟเวอร์หลักสำหรับระบบกระดานสนทนา (Web Board)
 * 🔧 เทคโนโลยี: Node.js + Express.js + Prisma (MySQL) + Mongoose (MongoDB)
 * 🚀 ฟีเจอร์: สมาชิก, กระทู้, คอมเมนต์, อัปโลดไฟล์, รายงาน, การจัดการผู้ใช้
 * 
 * ==================================================================================
 */

// 📦 โหลด dependencies และ models ที่จำเป็น
const Report = require("./models/Report");        // MongoDB model สำหรับข้อมูลการรายงาน
const express = require("express");               // Web framework หลัก
const cors = require("cors");                     // จัดการ Cross-Origin Resource Sharing
const path = require("path");                     // จัดการ path ของไฟล์
const fs = require("fs");                         // จัดการไฟล์ระบบ
const cookieParser = require("cookie-parser");     // จัดการ cookies
const multer = require("multer");                 // จัดการการอัปโลดไฟล์
const { PrismaClient } = require("@prisma/client"); // ORM สำหรับ MySQL database
const bcrypt = require("bcryptjs");               // เข้ารหัสรหัสผ่านอย่างปลอดภัย
const jwt = require("jsonwebtoken");              // สร้างและตรวจสอบ JWT tokens
const rateLimit = require("express-rate-limit");   // ✅ จำกัดจำนวนการเรียก API
const compression = require("compression");        // ✅ บีบอัดข้อมูลเพื่อลดขนาด
const helmet = require("helmet");                 // ✅ เพิ่มความปลอดภัยด้วย HTTP headers

// 🗄️ ตั้งค่า Prisma Client สำหรับ MySQL (ข้อมูลหลัก: users, threads, comments)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL // URL สำหรับเชื่อมต่อ MySQL database
    }
  },
  // ✅ Optimized logging: แสดง query ใน dev mode เท่านั้น
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
});

// 🚀 สร้าง Express application
const app = express();

// 📊 โหลด MongoDB model สำหรับ ActivityLog
const ActivityLog = require("./models/ActivityLog");

// 🍃 เชื่อมต่อ MongoDB สำหรับเก็บ reports และ activity logs
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/miniforum");

/* ==================================================================================
 * 🔒 RATE LIMITING CONFIGURATION - การจำกัดจำนวนการเรียก API
 * ==================================================================================
 * วัตถุประสงค์: ป้องกันการโจมตีแบบ DDoS และการใช้งาน API มากเกินไป
 * ประเภท: แบ่งตาม endpoint เพื่อให้มีความยืดหยุ่น
 */

// 🛡️ General Rate Limiting - สำหรับ API ทั่วไป (100 ครั้ง ใน 15 นาที)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // หน้าต่างเวลา: 15 นาที
  max: 100,                   // จำนวนครั้งสูงสุด: 100 requests per IP
  message: {
    ok: false,
    message: "คำขอมากเกินไป กรุณาลองใหม่ในภายหลัง" // ข้อความเมื่อเกินลิมิต
  },
  standardHeaders: true,      // ส่ง rate limit headers
  legacyHeaders: false,       // ไม่ใช้ headers แบบเก่า
  skip: (req) => {
    // ข้าม rate limiting สำหรับ health check
    return req.path === '/api/health';
  }
});

// 🔐 Auth Rate Limiting - สำหรับการเข้าสู่ระบบ (5 ครั้ง ใน 15 นาที)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // หน้าต่างเวลา: 15 นาที
  max: 5,                     // จำนวนครั้งสูงสุด: 5 attempts per IP
  message: {
    ok: false,
    message: "พยายามเข้าสู่ระบบมากเกินไป กรุณารอสักครู่" // ข้อความเมื่อเกินลิมิต
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // ไม่นับการเข้าสู่ระบบที่สำเร็จ
});

// ✏️ Content Creation Rate Limiting - สำหรับการสร้างกระทู้ (10 ครั้ง ต่อ ชั่วโมง)
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // หน้าต่างเวลา: 1 ชั่วโมง
  max: 10,                    // จำนวนครั้งสูงสุด: 10 posts per IP
  message: {
    ok: false,
    message: "สร้างกระทู้มากเกินไป กรุณารอก่อนสร้างใหม่" // ข้อความเมื่อเกินลิมิต
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 💬 Comment Rate Limiting - สำหรับการแสดงความคิดเห็น (30 ครั้ง ต่อ ชั่วโมง)
const commentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // หน้าต่างเวลา: 1 ชั่วโมง
  max: 30,                    // จำนวนครั้งสูงสุด: 30 comments per IP
  message: {
    ok: false,
    message: "แสดงความคิดเห็นมากเกินไป กรุณาชะลอการโพสต์" // ข้อความเมื่อเกินลิมิต
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 🚨 Report Rate Limiting - สำหรับการรายงาน (5 ครั้ง ต่อ วัน)
const reportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // หน้าต่างเวลา: 24 ชั่วโมง
  max: 5,                         // จำนวนครั้งสูงสุด: 5 reports per IP
  message: {
    ok: false,
    message: "รายงานมากเกินไปในวันนี้ กรุณาลองใหม่พรุ่งนี้" // ข้อความเมื่อเกินลิมิต
  },
  standardHeaders: true,
  legacyHeaders: false
});

/* ==================================================================================
 * 🔧 MIDDLEWARE CONFIGURATION - การตั้งค่า middleware ต่างๆ
 * ==================================================================================
 * ลำดับการใส่ middleware มีความสำคัญ ต้องเรียงตามลำดับที่ถูกต้อง
 */

// 🛡️ Security Headers - เพิ่มความปลอดภัยด้วย HTTP headers (ต้องมาก่อนอื่น)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],                                    // อนุญาตเฉพาะ same origin
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"], // CSS sources
      scriptSrc: ["'self'", "'unsafe-inline'"],                 // JavaScript sources  
      imgSrc: ["'self'", "data:", "https:", "http://localhost:*"], // Image sources
      connectSrc: ["'self'", "http://localhost:*"],              // AJAX/WebSocket connections
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],          // Font sources
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }         // อนุญาต cross-origin requests
}));

// 📦 Response Compression - บีบอัดข้อมูลเพื่อเพิ่มความเร็วในการโหลด
app.use(compression({
  filter: (req, res) => {
    // ข้ามการบีบอัดถ้ามี header ไม่ให้บีบอัด
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6, // Good balance between compression and speed
  threshold: 1024 // Only compress responses > 1KB
}));

// 🌐 CORS Configuration - จัดการ Cross-Origin Resource Sharing (ต้องมาก่อน static files)
app.use(cors({ 
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"], // URL ที่อนุญาต
  credentials: true,                          // อนุญาต cookies/credentials
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // HTTP methods ที่อนุญาต
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"], // Headers ที่อนุญาต
  exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"] // Headers ที่ส่งให้ client
}));

// 📁 Static File Serving - เสิร์ฟไฟล์รูปภาพและไฟล์อื่นๆ พร้อม caching
app.use("/static", express.static(path.join(__dirname, "../static"), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : '1h', // Cache: 7 วันใน production, 1 ชั่วโมงใน dev
  etag: true,                                 // ใช้ ETag สำหรับ cache validation
  lastModified: true,                         // ใช้ Last-Modified header
  setHeaders: (res, path, stat) => {
    // ตั้งค่า CORS headers สำหรับ static files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // ปรับแต่ง caching ตามประเภทไฟล์
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif')) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // Cache รูปภาพ 7 วัน
    }
  }
}));

// 🛡️ ใช้ general rate limiting กับ API routes เท่านั้น
app.use('/api', generalLimiter);

// 📝 การประมวลผล request body และ cookies
app.use(express.json({ limit: '10mb' })); // แปลง JSON body พร้อมจำกัดขนาด 10MB
app.use(cookieParser()); // แปลง cookies จาก request

// ⚙️ จัดการ preflight OPTIONS requests สำหรับ CORS
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    // ตั้งค่า CORS headers สำหรับ preflight requests
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.sendStatus(200); // ส่งสถานะ OK กลับ
  }
  next(); // ไปยัง middleware ถัดไป
});

/* ==================================================================================
 * 📤 FILE UPLOAD CONFIGURATION - การตั้งค่าการอัปโหลดไฟล์
 * ==================================================================================
 * ใช้ multer สำหรับจัดการการอัปโหลดไฟล์รูปภาพ
 * แบ่งเป็นประเภท: รูปกระทู้, อวตาร์, รูปคอมเมนต์
 */
// 📁 สร้างโฟลเดอร์สำหรับเก็บไฟล์ที่อัปโหลด
const uploadDirs = {
  thread: path.join(__dirname, "../static/thread_images"),    // โฟลเดอร์รูปภาพกระทู้
  avatar: path.join(__dirname, "../static/avatars")          // โฟลเดอร์รูปอวตาร์
};
// สร้างโฟลเดอร์ทั้งหมดถ้ายังไม่มี (recursive: true = สร้างโฟลเดอร์ parent ด้วย)
Object.values(uploadDirs).forEach(dir => fs.mkdirSync(dir, { recursive: true }));

// 🖼️ ตั้งค่า multer สำหรับอัปโหลดรูปภาพกระทู้
const threadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDirs.thread), // โฟลเดอร์ปลายทาง
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);               // ดึงนามสกุลไฟล์
    cb(null, `thread-${Date.now()}${ext}`);                   // ตั้งชื่อไฟล์: thread-timestamp.ext
  }
});

// 👤 ตั้งค่า multer สำหรับอัปโหลดรูปอวตาร์
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDirs.avatar), // โฟลเดอร์ปลายทาง  
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);               // ดึงนามสกุลไฟล์
    cb(null, `avatar-${Date.now()}${ext}`);                   // ตั้งชื่อไฟล์: avatar-timestamp.ext
  }
});

// 📤 สร้าง multer instances สำหรับการอัปโหลดไฟล์ประเภทต่างๆ
const uploadThread = multer({ storage: threadStorage }); // สำหรับรูปภาพกระทู้
const uploadAvatar = multer({ storage: avatarStorage }); // สำหรับรูปอวตาร์

// 💬 ตั้งค่า multer สำหรับรูปภาพคอมเมนต์
const commentImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../static/comment_images"); // โฟลเดอร์รูปคอมเมนต์
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });                     // สร้างโฟลเดอร์ถ้ายังไม่มี
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);                   // ดึงนามสกุลไฟล์
    // ตั้งชื่อไฟล์แบบ unique: comment_timestamp_randomstring.ext
    const filename = `comment_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
    cb(null, filename);
  }
});

// 📷 สร้าง multer instance สำหรับรูปคอมเมนต์ พร้อมการตรวจสอบ
const uploadCommentImage = multer({
  storage: commentImageStorage,                    // ใช้ storage ที่ตั้งค่าไว้
  limits: { fileSize: 5 * 1024 * 1024 },         // จำกัดขนาดไฟล์ 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {     // ยอมรับเฉพาะไฟล์รูปภาพ
      cb(null, true);
    } else {
      cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพเท่านั้น'), false);
    }
  }
});

/* ==================================================================================
 * 💊 HEALTH CHECK - การตรวจสอบสถานะเซิร์ฟเวอร์
 * ================================================================================== 
 */

// 🩺 API ตรวจสอบสถานะเซิร์ฟเวอร์ (ไม่มี rate limiting)
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    time: new Date().toISOString(),
    status: 'Server is running' 
  });
});

/* ==================================================================================
 * 🔐 AUTHENTICATION APIs - การจัดการการเข้าสู่ระบบ
 * ==================================================================================
 * ฟีเจอร์: สมัครสมาชิก, เข้าสู่ระบบ, ออกจากระบบ
 * ความปลอดภัย: bcrypt สำหรับ hash password, JWT สำหรับ session
 */
// 📝 API สมัครสมาชิกใหม่ - พร้อม rate limiting (5 ครั้ง/15นาที)
app.post("/api/register", authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    
    // 🔍 ตรวจสอบข้อมูลที่จำเป็น
    if (!username || !email || !password) {
      return res.status(400).json({ ok: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }
    
    // 🔒 ตรวจสอบความยาวรหัสผ่าน (ความปลอดภัย)
    if (password.length < 6) {
      return res.status(400).json({ ok: false, message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
    }

    // 🔐 เข้ารหัสรหัสผ่านด้วย bcrypt (salt rounds = 10)
    const passHash = await bcrypt.hash(password, 10);
    
    // 💾 สร้างบัญชีผู้ใช้ใหม่ในฐานข้อมูล
    const user = await prisma.user.create({
      data: {
        username,                                    // ชื่อผู้ใช้
        email,                                       // อีเมล
        passHash,                                    // รหัสผ่านที่เข้ารหัสแล้ว
        role: "user",                               // สิทธิ์เริ่มต้น: user
        avatarUrl: "/static/avatars/default.png",   // รูปโปรไฟล์เริ่มต้น
      },
      // 🎯 เลือกเฉพาะข้อมูลที่ต้องการส่งกลับ (ไม่รวม passHash)
      select: { id: true, username: true, email: true, role: true, avatarUrl: true },
    });

    // 📊 บันทึก log การสมัครสมาชิก
    await saveLog(user.id, user.username, 'register', 'สมัครสมาชิกใหม่', req);

    return res.json({ ok: true, message: "สมัครสมาชิกสำเร็จ", user });
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

// ✅ Optimized log saving with batching
let logQueue = [];
const BATCH_SIZE = 10;
const BATCH_TIMEOUT = 5000; // 5 seconds

const saveLog = async (userId, username, action, details, req) => {
  try {
    const logEntry = {
      userId,
      username,
      action,
      details,
      ip: req?.ip || req?.connection?.remoteAddress || 'unknown',
      timestamp: new Date()
    };
    
    logQueue.push(logEntry);
    
    // Process batch when it reaches size limit
    if (logQueue.length >= BATCH_SIZE) {
      await processBatch();
    }
  } catch (error) {
    console.log('Log queue failed:', error.message);
  }
};

// Process log batch
const processBatch = async () => {
  if (logQueue.length === 0) return;
  
  const batch = logQueue.splice(0, BATCH_SIZE);
  try {
    await ActivityLog.insertMany(batch);
  } catch (error) {
    console.log('Batch log save failed:', error.message);
  }
};

// Process remaining logs every 5 seconds
setInterval(processBatch, BATCH_TIMEOUT);

// ✅ API เข้าสู่ระบบ - พร้อม rate limiting
app.post("/api/login", authLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  const user = await prisma.user.findFirst({ where: { username } });
  if (!user) return res.status(401).json({ ok: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });

  const ok = await bcrypt.compare(password, user.passHash);
  if (!ok) return res.status(401).json({ ok: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "changeme",
    { expiresIn: "7d" }
  );

  // เก็บ log login
  await saveLog(user.id, user.username, 'login', 'เข้าสู่ระบบ', req);

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
// ✅ Simple memory cache for threads (5 minutes)
const threadCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// API ดึงรายการกระทู้ทั้งหมด หรือกรองตามหมวดหมู่ - พร้อม caching และ pagination
app.get("/api/threads", async (req, res) => {
  try {
    const categoryId = req.query.category ? parseInt(req.query.category, 10) : null;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20; // Default 20 items per page
    const skip = (page - 1) * limit;
    
    const cacheKey = `threads_${categoryId || 'all'}_${page}_${limit}`;
    
    // Check cache first
    if (threadCache.has(cacheKey)) {
      const cached = threadCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        return res.json(cached.data);
      }
      threadCache.delete(cacheKey);
    }
    
    const where = categoryId ? { categoryId } : {};

    // ✅ Optimized query with pagination
    const [items, total] = await Promise.all([
      prisma.thread.findMany({
        where,
        include: { 
          author: { 
            select: { id: true, email: true, username: true, avatarUrl: true } 
          },
          _count: {
            select: { comments: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: skip
      }),
      prisma.thread.count({ where })
    ]);

    const response = { 
      ok: true, 
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
    
    // Cache the result
    threadCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching threads:', error);
    res.status(500).json({ ok: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลกระทู้" });
  }
});

// ✅ API สร้างกระทู้ใหม่ - พร้อม rate limiting
app.post("/api/threads", createLimiter, uploadThread.single("cover"), async (req, res) => {
  const { title, body, tags, categoryId } = req.body;
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
        categoryId: catId
      },
      include: {
        author: {
          select: { id: true, username: true, email: true, avatarUrl: true }
        }
      }
    });

    // เก็บ log สร้างกระทู้
    await saveLog(userId, thread.author.username, 'create_thread', `สร้างกระทู้: ${title}`, req);

    // ✅ Clear thread cache when new thread is created
    clearThreadCache();

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

// ✅ Helper functions to clear caches
function clearThreadCache() {
  for (const key of threadCache.keys()) {
    if (key.startsWith('thread_') || key.startsWith('threads_')) {
      threadCache.delete(key);
    }
  }
}

function clearCommentCache(threadId) {
  for (const key of threadCache.keys()) {
    if (key.startsWith(`comments_${threadId}_`)) {
      threadCache.delete(key);
    }
  }
}

// API ดึงข้อมูลกระทู้ตาม ID พร้อมข้อมูลผู้เขียน - พร้อม caching
app.get("/api/threads/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ ok: false, message: "bad id" });

    const cacheKey = `thread_${id}`;
    
    // Check cache first
    if (threadCache.has(cacheKey)) {
      const cached = threadCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        return res.json(cached.data);
      }
      threadCache.delete(cacheKey);
    }

    // ✅ Optimized query with comment count
    const t = await prisma.thread.findUnique({
      where: { id },
      include: { 
        author: { 
          select: { id: true, email: true, username: true, avatarUrl: true } 
        },
        _count: {
          select: { comments: true }
        }
      },
    });
    
    if (!t) return res.status(404).json({ ok: false, message: "not found" });

    const response = { ok: true, thread: t };
    
    // Cache the result
    threadCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });

    res.json(response);
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).json({ ok: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลกระทู้" });
  }
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

  // ✅ Clear thread cache when thread is deleted
  clearThreadCache();

  res.json({ ok: true });
});

// API ดึงคอมเมนต์ทั้งหมดของกระทู้ - พร้อม pagination และ caching
app.get("/api/threads/:id/comments", async (req, res) => {
  try {
    const threadId = parseInt(req.params.id, 10);
    if (Number.isNaN(threadId)) return res.status(400).json({ ok: false, message: "bad id" });
    
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50; // Default 50 comments per page
    const skip = (page - 1) * limit;
    
    const cacheKey = `comments_${threadId}_${page}_${limit}`;
    
    // Check cache first
    if (threadCache.has(cacheKey)) {
      const cached = threadCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        return res.json(cached.data);
      }
      threadCache.delete(cacheKey);
    }

    // ตรวจสอบว่ากระทู้มีอยู่จริง (cached)
    const threadCacheKey = `thread_${threadId}`;
    let thread = null;
    
    if (threadCache.has(threadCacheKey)) {
      const cached = threadCache.get(threadCacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        thread = cached.data.thread;
      }
    }
    
    if (!thread) {
      thread = await prisma.thread.findUnique({ where: { id: threadId } });
      if (!thread) return res.status(404).json({ ok: false, message: "ไม่พบกระทู้" });
    }

    // ✅ Optimized query with pagination
    const [items, total] = await Promise.all([
      prisma.comment.findMany({
        where: { threadId },
        include: { 
          author: { 
            select: { id: true, username: true, email: true, avatarUrl: true } 
          } 
        },
        orderBy: { createdAt: "asc" },
        take: limit,
        skip: skip
      }),
      prisma.comment.count({ where: { threadId } })
    ]);

    const response = { 
      ok: true, 
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
    
    // Cache the result
    threadCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });

    res.json(response);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ ok: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลคอมเมนต์" });
  }
});

// ✅ API สร้างคอมเมนต์ใหม่ - พร้อม rate limiting
app.post("/api/threads/:id/comments", commentLimiter, uploadCommentImage.single("image"), async (req, res) => {
  try {
    const threadId = parseInt(req.params.id, 10);
    const { body } = req.body || {};
    
    // ดึง user จาก token
    const auth = req.headers.authorization || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    let user = null;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
    } catch {
      return res.status(401).json({ ok: false, message: "Invalid token" });
    }
    
    if (!body?.trim() && !req.file) {
      return res.status(400).json({ ok: false, message: "ต้องมีข้อความหรือรูปภาพ" });
    }

    const thread = await prisma.thread.findUnique({ where: { id: threadId } });
    if (!thread) return res.status(404).json({ ok: false, message: "ไม่พบกระทู้" });

    const comment = await prisma.comment.create({
      data: {
        body: body?.trim() || "",
        imageUrl: req.file ? `/static/comment_images/${req.file.filename}` : null,
        threadId,
        authorId: user.id,
      },
      include: {
        author: { select: { id: true, username: true, email: true, avatarUrl: true } }
      }
    });

    // Log comment creation
    await saveLog(user.id, comment.author.username, "create_comment", `แสดงความคิดเห็น: ${thread.title}`, req);

    // ✅ Clear comment cache when new comment is created
    clearCommentCache(threadId);

    res.json({ ok: true, comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "เกิดข้อผิดพลาด" });
  }
});

// API ลบคอมเมนต์ - เฉพาะเจ้าของหรือ admin
app.delete("/api/comments/:id", async (req, res) => {
  const commentId = parseInt(req.params.id, 10);
  if (Number.isNaN(commentId)) return res.status(400).json({ ok: false, message: "Invalid comment ID" });
  
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let user = null;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
  } catch {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  try {
    // ค้นหาคอมเมนต์
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return res.status(404).json({ ok: false, message: "Comment not found" });

    // ตรวจสอบสิทธิ์ (เจ้าของหรือ admin เท่านั้น)
    if (comment.authorId !== user.id && user.role !== "admin") {
      return res.status(403).json({ ok: false, message: "Permission denied" });
    }

    // ลบรูปภาพถ้ามี
    if (comment.imageUrl) {
      try {
        const imagePath = path.join(__dirname, "..", comment.imageUrl);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (err) {
        console.log("Failed to delete comment image:", err.message);
      }
    }

    // ลบคอมเมนต์
    await prisma.comment.delete({ where: { id: commentId } });

    // เก็บ log ลบคอมเมนต์
    await saveLog(user.id, user.email, 'delete_comment', `ลบคอมเมนต์ ID: ${commentId}`, req);

    res.json({ ok: true, message: "ลบคอมเมนต์สำเร็จ" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// API แก้ไขคอมเมนต์ - เฉพาะเจ้าของ
app.put("/api/comments/:id", uploadCommentImage.single("image"), async (req, res) => {
  const commentId = parseInt(req.params.id, 10);
  if (Number.isNaN(commentId)) return res.status(400).json({ ok: false, message: "Invalid comment ID" });
  
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let user = null;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
  } catch {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  try {
    // ค้นหาคอมเมนต์
    const existingComment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!existingComment) return res.status(404).json({ ok: false, message: "Comment not found" });

    // ตรวจสอบสิทธิ์ (เจ้าของเท่านั้น)
    if (existingComment.authorId !== user.id) {
      return res.status(403).json({ ok: false, message: "Permission denied" });
    }

    const { body } = req.body;
    
    // ตรวจสอบว่ามีข้อมูลที่จะอัปเดต
    if (!body?.trim() && !req.file) {
      return res.status(400).json({ ok: false, message: "Body or image is required" });
    }

    let updateData = {};
    
    // อัปเดต body ถ้ามี
    if (body?.trim()) {
      updateData.body = body.trim();
    }

    // จัดการรูปภาพใหม่
    if (req.file) {
      // ลบรูปเดิมถ้ามี
      if (existingComment.imageUrl) {
        try {
          const oldImagePath = path.join(__dirname, "..", existingComment.imageUrl);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        } catch (err) {
          console.log("Failed to delete old comment image:", err.message);
        }
      }
      updateData.imageUrl = `/static/comment_images/${req.file.filename}`;
    }

    // อัปเดตคอมเมนต์
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: updateData,
      include: {
        author: {
          select: { id: true, username: true, email: true, avatarUrl: true }
        }
      }
    });

    // เก็บ log แก้ไขคอมเมนต์
    await saveLog(user.id, user.email, 'edit_comment', `แก้ไขคอมเมนต์ ID: ${commentId}`, req);

    res.json({ ok: true, comment: updatedComment, message: "แก้ไขคอมเมนต์สำเร็จ" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
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
// ✅ API รายงานกระทู้ - พร้อม rate limiting
app.post("/api/reports", reportLimiter, async (req, res) => {
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
  
  const report = await Report.create({
    threadId,
    threadTitle,
    reporterId: user.id,
    reporterEmail: user.email,
    reason
  });

  // เก็บ log รายงานกระทู้
  await saveLog(user.id, user.email, 'report', `รายงานกระทู้: ${threadTitle}`, req);

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

// API ดู logs (เฉพาะ admin)
app.get("/api/logs", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let user = null;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
  if (user.role !== "admin") return res.status(403).json({ ok: false, message: "forbidden" });

  const { page = 1, limit = 50 } = req.query;
  
  const logs = await ActivityLog.find()
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await ActivityLog.countDocuments();

  res.json({ 
    ok: true, 
    logs, 
    pagination: { page: parseInt(page), limit: parseInt(limit), total }
  });
});

// 🔍 API ยืนยันอีเมล - ตรวจสอบว่าอีเมลมีอยู่ในระบบหรือไม่ (สำหรับ Forgot Password Step 1)
app.post("/api/verify-email", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    // 📝 ตรวจสอบข้อมูลที่จำเป็น
    if (!email) {
      return res.status(400).json({ 
        ok: false, 
        message: "กรุณาระบุอีเมล" 
      });
    }

    // 🔍 ตรวจสอบ email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        ok: false, 
        message: "รูปแบบอีเมลไม่ถูกต้อง" 
      });
    }

    // 📊 ค้นหา user จากอีเมลใน database
    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, username: true } // เลือกเฉพาะข้อมูลที่จำเป็น
    });

    if (!user) {
      return res.status(404).json({ 
        ok: false, 
        message: "ไม่พบอีเมลนี้ในระบบ กรุณาตรวจสอบความถูกต้อง" 
      });
    }

    // 📝 บันทึก activity log
    await ActivityLog.create({
      action: "email_verify_attempt",
      userId: user.id,
      email: user.email,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date()
    });

    // ✅ พบอีเมลแล้ว - ส่งข้อมูลยืนยัน (ไม่ส่งข้อมูลละเอียด)
    res.json({ 
      ok: true, 
      message: "พบอีเมลในระบบ สามารถดำเนินการขั้นตอนถัดไป",
      email: email.toLowerCase().trim()
    });
  } catch (error) {
    console.error("Error in verify-email:", error);
    res.status(500).json({ 
      ok: false, 
      message: "เกิดข้อผิดพลาดในการตรวจสอบอีเมล" 
    });
  }
});

// 🔒 API รีเซ็ตรหัสผ่าน - รับ email และรหัสผ่านใหม่ (Forgot Password Step 2)
app.post("/api/forgot-password", authLimiter, async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // 📝 ตรวจสอบข้อมูลที่จำเป็น
    if (!email || !newPassword) {
      return res.status(400).json({ 
        ok: false, 
        message: "กรุณาระบุอีเมลและรหัสผ่านใหม่" 
      });
    }

    // 🔍 ตรวจสอบความยาวรหัสผ่าน
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        ok: false, 
        message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" 
      });
    }

    // 📊 ค้นหา user จากอีเมล
    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase().trim() } 
    });
    
    if (!user) {
      return res.status(404).json({ 
        ok: false, 
        message: "ไม่พบผู้ใช้งานที่มีอีเมลนี้" 
      });
    }

    // 🔒 เข้ารหัสรหัสผ่านใหม่และอัปเดตในฐานข้อมูล
    const passHash = await bcrypt.hash(newPassword, 12); // เพิ่ม salt rounds เป็น 12
    await prisma.user.update({ 
      where: { email: email.toLowerCase().trim() }, 
      data: { 
        passHash // อัปเดตรหัสผ่านใหม่
      } 
    });

    // 📝 บันทึก activity log
    await ActivityLog.create({
      action: "password_reset_success",
      userId: user.id,
      email: user.email,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date()
    });

    // ✅ รีเซ็ตรหัสผ่านสำเร็จ
    res.json({ 
      ok: true, 
      message: "รีเซ็ตรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่" 
    });
  } catch (error) {
    console.error("Error in forgot-password:", error);
    res.status(500).json({ 
      ok: false, 
      message: "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน" 
    });
  }
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
