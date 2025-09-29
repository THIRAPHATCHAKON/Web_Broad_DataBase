// โมเดล MongoDB สำหรับเก็บข้อมูลการรายงานกระทู้
const mongoose = require("mongoose");

// Schema สำหรับข้อมูลการรายงาน
const ReportSchema = new mongoose.Schema({
  threadId: Number,        // ID ของกระทู้ที่ถูกรายงาน
  threadTitle: String,     // หัวข้อกระทู้ที่ถูกรายงาน
  reporterId: Number,      // ID ของผู้รายงาน
  reporterEmail: String,   // Email ของผู้รายงาน
  reason: String,          // เหตุผลในการรายงาน
  createdAt: { type: Date, default: Date.now } // วันที่รายงาน
});

module.exports = mongoose.model("Report", ReportSchema);