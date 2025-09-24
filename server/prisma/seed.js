// server/prisma/seed.js (CommonJS)
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const passHash = await bcrypt.hash("123456", 10);

  // สร้าง admin ถ้ายังไม่มี
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", passHash, role: "admin" },
  });

  // กระทู้ตัวอย่าง
  await prisma.thread.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: "Welcome Thread",
      body: "สวัสดีครับ ยินดีต้อนรับสู่ Mini Forum!",
      authorId: admin.id,
    },
  });

  console.log("✅ seed done:", admin.email);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
