https://chatgpt.com/share/68d371a4-026c-800f-a5d4-2e814a5f89b8
# Mini Forum

## Requirements
- Docker + Docker Compose
- Node 18+ (แนะนำ 20/22)

## 1) Start DB (MySQL + Adminer)
```bash
docker compose up -d
# Adminer: http://localhost:8080 (System: MySQL, Server: db, user: root, pass: example, db: mini_forum)

2) Server
cd server
cp env.example .env
npm i
npx prisma migrate dev
npm run db:seed     # optional: เพิ่ม admin@example.com / 123456
npm run dev         # API at http://localhost:3000


3) Client
cd client
npm i
npm run dev         # http://localhost:5173

สคริปต์ที่ควรมีใน package.json (server)

server/package.json

{
  "scripts": {
    "dev": "nodemon src/index.js",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "prisma:studio": "prisma studio"
  },
  "prisma": {
    "seed": "node prisma/seed.js"
  }
}

เช็คลิสต์ก่อน push

 รัน docker compose up -d ได้, Adminer เข้าได้

 server/.env ไม่ถูก commit (มีแค่ env.example)

 npx prisma migrate dev ผ่าน

 npm run db:seed ผ่าน (optional)

 npm run dev ทั้ง server/client พร้อมกันได้ (concurrently ที่ root ถ้ามี)


git clone <YOUR_REPO_URL>
cd Project   # โฟลเดอร์ตามจริง
docker compose up -d

cd server
cp env.example .env
npm i
npx prisma migrate dev
npm run db:seed
npm run dev   # API

cd ../client
npm i
npm run dev   # เว็บ
