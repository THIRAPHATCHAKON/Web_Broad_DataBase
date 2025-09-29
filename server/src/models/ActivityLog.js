/*
 * ==================================================================================
 * 📊 ACTIVITY LOG MODEL - โมเดลสำหรับเก็บ Log การกระทำของผู้ใช้
 * ==================================================================================
 * 
 * 🎯 วัตถุประสงค์: ติดตามและบันทึกกิจกรรมของผู้ใช้ในระบบ
 * 💾 ฐานข้อมูล: MongoDB (เหมาะสำหรับข้อมูล log ที่เขียนบ่อยและไม่ซับซ้อน)
 * 🔍 การใช้งาน: Admin ดู log, วิเคราะห์พฤติกรรม, security monitoring
 * 
 * ==================================================================================
 */

const mongoose = require("mongoose");

// 📋 Schema ของ Activity Log - บันทึกทุกการกระทำสำคัญในระบบ
const ActivityLogSchema = new mongoose.Schema({
  userId: Number,      // 🆔 ID ของผู้ใช้ที่ทำการกระทำ (อ้างอิงจาก MySQL)
  username: String,    // 👤 ชื่อผู้ใช้ (เก็บเผื่อ user ถูกลบแล้ว)
  action: String,      // 🎯 ประเภทของการกระทำ (login, register, create_thread, etc.)
  details: String,     // 📝 รายละเอียดเพิ่มเติม (หัวข้อกระทู้, ข้อความ, etc.)
  ip: String,          // 🌐 IP Address ของผู้ใช้ (สำหรับ security tracking)
  timestamp: { type: Date, default: Date.now } // ⏰ วันเวลาที่เกิดเหตุการณ์
});

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);