/*
 * ==================================================================================
 * 🔑 FORGOT PASSWORD PAGE - หน้ารีเซ็ตรหัสผ่าน
 * ==================================================================================
 * 
 * 🎯 วัตถุประสงค์: ให้ผู้ใช้สามารถรีเซ็ตรหัสผ่านใหม่เมื่อลืมรหัสผ่าน
 * 🔒 ความปลอดภัย: ต้องใส่อีเมลที่ถูกต้องและรหัสผ่านใหม่
 * 🎨 UX/UI: Form validation, Loading state, Success message
 * 
 * ==================================================================================
 */

import { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
    // 📝 States สำหรับข้อมูล form
    const [email, setEmail] = useState("");               // อีเมลที่ต้องการรีเซ็ตรหัสผ่าน
    const [newPassword, setNewPassword] = useState("");   // รหัสผ่านใหม่
    
    // 🎛️ States สำหรับ UI control
    const [submitting, setSubmitting] = useState(false);  // สถานะการส่งข้อมูล
    const [message, setMessage] = useState("");           // ข้อความแจ้งผลลัพธ์

    // 🚀 ฟังก์ชันจัดการการส่ง form รีเซ็ตรหัสผ่าน
    async function onSubmit(e) {
        e.preventDefault();                              // ป้องกันการ refresh หน้า
        if (submitting) return;                          // ป้องกันการส่งซ้ำ
        setSubmitting(true);                             // ตั้งสถานะเป็นกำลังส่ง

        try {
            // 📡 ส่งข้อมูลรีเซ็ตรหัสผ่านไปยังเซิร์ฟเวอร์
            const res = await fetch("/api/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    email: email.trim(),                 // ตัดช่องว่างหน้า-หลัง
                    newPassword                          // รหัสผ่านใหม่
                }),
            });

            // 🎯 ตรวจสอบผลลัพธ์จากเซิร์ฟเวอร์
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || "เกิดข้อผิดพลาด");

            // ✅ รีเซ็ตสำเร็จ - แสดงข้อความยืนยัน
            setMessage("รหัสผ่านถูกรีเซ็ตเรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่");
        } catch (err) {
            // ❌ เกิดข้อผิดพลาด - แสดงข้อความแจ้งเตือน
            alert(err.message || "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน");
        } finally {
            setSubmitting(false);                        // รีเซ็ตสถานะการส่ง
        }
    }

    return (
        <div className="d-flex justify-content-center align-items-center vh-100">
            <div className="card p-4 col-11 col-sm-8 col-md-5 col-lg-4">
                <h3 className="text-center mb-3">ลืมรหัสผ่าน</h3>
                <form onSubmit={onSubmit}>
                    <div className="mb-3">
                        <label className="form-label" htmlFor="forgot-password-email">อีเมล</label>
                        <input
                            type="email"
                            className="form-control"
                            id="forgot-password-email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="username"
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label" htmlFor="forgot-password-new-password">รหัสผ่านใหม่</label>
                        <input
                            type="password"
                            className="form-control"
                            id="forgot-password-new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            autoComplete="username"
                        />
                    </div>
                    <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
                        {submitting ? "กำลังส่ง..." : "รีเซ็ตรหัสผ่าน"}
                    </button>
                    {message && <p className="text-success mt-3">{message}</p>}
                    <p className="text-center mt-3">
                        กลับไปที่ <Link to="/login">เข้าสู่ระบบ</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
