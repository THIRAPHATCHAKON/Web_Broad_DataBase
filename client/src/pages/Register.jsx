/*
 * ==================================================================================
 * 📝 REGISTER PAGE - หน้าสมัครสมาชิก
 * ==================================================================================
 * 
 * 🎯 วัตถุประสงค์: รับข้อมูลการสมัครสมาชิกและส่งไปยังเซิร์ฟเวอร์
 * 🔒 การตรวจสอบ: Validation รหัสผ่าน, ความยาว, การยืนยันรหัสผ่าน
 * 🎨 UX/UI: Real-time validation, Loading states, Error messages
 * 
 * ==================================================================================
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  // 📝 States สำหรับข้อมูล form
  const [username, setUsername]         = useState("");        // ชื่อผู้ใช้
  const [email, setEmail]               = useState("");        // อีเมล
  const [password, setPassword]         = useState("");        // รหัสผ่าน
  const [confirmPassword, setConfirm]   = useState("");        // ยืนยันรหัสผ่าน
  
  // 🎛️ States สำหรับ UI control
  const [loading, setLoading]           = useState(false);     // สถานะการส่งข้อมูล
  const [error, setError]               = useState("");        // ข้อความแสดงข้อผิดพลาด
  
  const navigate = useNavigate();

  // 🚀 ฟังก์ชันจัดการการส่ง form สมัครสมาชิก
  async function onSubmit(e) {
    e.preventDefault();                                      // ป้องกันการ refresh หน้า
    setError("");                                            // ล้างข้อความข้อผิดพลาดเดิม

    // 🔍 Client-side validation - ตรวจสอบข้อมูลก่อนส่งไปเซิร์ฟเวอร์
    if (password.length < 6) {
      return setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    }
    if (password !== confirmPassword) {
      return setError("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
    }
    if (!username.trim()) {
      return setError("กรุณากรอกชื่อผู้ใช้");
    }

    try {
      setLoading(true);                                      // ตั้งสถานะเป็นกำลังส่งข้อมูล
      
      // 📡 ส่งข้อมูลการสมัครสมาชิกไปยังเซิร์ฟเวอร์
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.message || "สมัครสมาชิกไม่สำเร็จ");
      }

      // สมัครสำเร็จ: เลือก 1 วิธี
      // วิธี A: พาไปหน้า login
      navigate("/login");

      // วิธี B: login อัตโนมัติ (ถ้า /api/register คืน user/token มา)
      // const data = await r.json();
      // sessionStorage.setItem("user", JSON.stringify(data.user));
      // sessionStorage.setItem("token", data.token);
      // navigate("/Thread");

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="card p-4 col-11 col-sm-8 col-md-5 col-lg-4">
        <h3 className="text-center mb-3">สมัครสมาชิก</h3>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <form id="register-form" onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="form-label">ชื่อผู้ใช้</label>
            <input
              type="text" className="form-control" id="reg-username"
              value={username} onChange={(e) => setUsername(e.target.value)} required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">อีเมล</label>
            <input
              type="email" className="form-control" id="reg-email"
              value={email} onChange={(e) => setEmail(e.target.value)} required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">รหัสผ่าน</label>
            <input
              type="password" className="form-control" id="reg-password"
              value={password} onChange={(e) => setPassword(e.target.value)} required
              minLength={6}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">ยืนยันรหัสผ่าน</label>
            <input
              type="password" className="form-control" id="reg-confirm"
              value={confirmPassword} onChange={(e) => setConfirm(e.target.value)} required
              minLength={6}
            />
          </div>

          <button type="submit" className="btn btn-success w-100" disabled={loading}>
            {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </button>

          <p className="text-center mt-3">
            มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
