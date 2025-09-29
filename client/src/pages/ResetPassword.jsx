/*
 * ==================================================================================
 * 🔒 RESET PASSWORD - STEP 2 - หน้าตั้งรหัสผ่านใหม่
 * ==================================================================================
 * 
 * 🎯 วัตถุประสงค์: หน้าสำหรับตั้งรหัสผ่านใหม่หลังจากยืนยันอีเมลแล้ว
 * 🔒 ความปลอดภัย: ยืนยันรหัสผ่านใหม่ 2 ครั้ง, ตรวจสอบความแข็งแกร่ง
 * 🎨 UX/UI: Password strength indicator, Form validation, Success redirect
 * 
 * ขั้นตอนการใช้งาน:
 * 1. รับอีเมลจาก URL parameters (มาจากหน้า ForgotPassword)
 * 2. ให้ผู้ใช้ใส่รหัสผ่านใหม่และยืนยัน
 * 3. ตรวจสอบความแข็งแกร่งของรหัสผ่าน
 * 4. ส่งข้อมูลไปเซิร์ฟเวอร์และ redirect ไป login
 * 
 * ==================================================================================
 */

import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export default function ResetPassword() {
    // 📝 States สำหรับข้อมูล form
    const [newPassword, setNewPassword] = useState("");         // รหัสผ่านใหม่
    const [confirmPassword, setConfirmPassword] = useState(""); // ยืนยันรหัสผ่านใหม่
    
    // 🎛️ States สำหรับ UI control
    const [submitting, setSubmitting] = useState(false);        // สถานะการส่งข้อมูล
    const [error, setError] = useState("");                     // ข้อความแสดงข้อผิดพลาด
    const [showPassword, setShowPassword] = useState(false);    // แสดง/ซ่อนรหัสผ่าน
    
    // 🔗 URL parameters และ navigation
    const [searchParams] = useSearchParams();
    const email = searchParams.get("email");                   // อีเมลจาก URL
    const navigate = useNavigate();

    // 🔍 ตรวจสอบความแข็งแกร่งของรหัสผ่าน
    const getPasswordStrength = (password) => {
        if (password.length < 6) return { level: 0, text: "รหัสผ่านสั้นเกินไป", color: "danger" };
        if (password.length < 8) return { level: 1, text: "รหัสผ่านอ่อน", color: "warning" };
        
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecial].filter(Boolean).length;
        
        if (strength <= 2) return { level: 2, text: "รหัสผ่านปานกลาง", color: "info" };
        if (strength === 3) return { level: 3, text: "รหัสผ่านแข็งแกร่ง", color: "success" };
        return { level: 4, text: "รหัสผ่านแข็งแกร่งมาก", color: "success" };
    };

    // 🔄 ตรวจสอบเมื่อโหลดหน้า - ถ้าไม่มี email ใน URL ให้กลับไปหน้า forgot password
    useEffect(() => {
        if (!email) {
            navigate("/forgot-password");
        }
    }, [email, navigate]);

    // 🔒 ฟังก์ชันตั้งรหัสผ่านใหม่
    async function resetPassword(e) {
        e.preventDefault();                              // ป้องกันการ refresh หน้า
        if (submitting) return;                          // ป้องกันการส่งซ้ำ

        // 🔍 ตรวจสอบรหัสผ่าน
        if (newPassword.length < 6) {
            setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน");
            return;
        }

        setSubmitting(true);                             // ตั้งสถานะเป็นกำลังส่ง
        setError("");                                    // ล้างข้อความ error

        try {
            // 📡 ส่งข้อมูลรีเซ็ตรหัสผ่านไปยังเซิร์ฟเวอร์
            const res = await fetch("/api/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    email: email,                        // อีเมลที่ยืนยันแล้ว
                    newPassword                          // รหัสผ่านใหม่
                }),
            });

            // 🎯 ตรวจสอบผลลัพธ์จากเซิร์ฟเวอร์
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน");

            // ✅ รีเซ็ตสำเร็จ - แสดงข้อความและ redirect
            alert("รหัสผ่านถูกรีเซ็ตเรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่");
            navigate("/login");
        } catch (err) {
            // ❌ เกิดข้อผิดพลาด - แสดงข้อความแจ้งเตือน
            setError(err.message || "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน");
        } finally {
            setSubmitting(false);                        // รีเซ็ตสถานะการส่ง
        }
    }

    // 🚫 ถ้าไม่มี email ใน URL ให้แสดงหน้า loading
    if (!email) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="spinner-border text-primary"></div>
            </div>
        );
    }

    const passwordStrength = getPasswordStrength(newPassword);

    return (
        <div className="d-flex justify-content-center align-items-center vh-100">
            <div className="card p-4 col-11 col-sm-8 col-md-5 col-lg-4">
                {/* 📋 Header */}
                <div className="text-center mb-4">
                    <div className="mb-3">
                        <i className="bi bi-shield-lock text-success" style={{fontSize: '3rem'}}></i>
                    </div>
                    <h3>ตั้งรหัสผ่านใหม่</h3>
                    <div className="alert alert-info py-2">
                        <small>
                            <i className="bi bi-person-check me-2"></i>
                            อีเมล: <strong>{email}</strong> ได้รับการยืนยันแล้ว
                        </small>
                    </div>
                </div>

                {/* 📝 Form ตั้งรหัสผ่านใหม่ */}
                <form onSubmit={resetPassword}>
                    {/* รหัสผ่านใหม่ */}
                    <div className="mb-3">
                        <label className="form-label" htmlFor="new-password">
                            <i className="bi bi-lock me-2"></i>
                            รหัสผ่านใหม่
                        </label>
                        <div className="input-group">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="form-control"
                                id="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="กรุณาใส่รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                                required
                                minLength={6}
                                autoComplete="new-password"
                                disabled={submitting}
                                autoFocus
                            />
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={submitting}
                            >
                                <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                            </button>
                        </div>
                        
                        {/* Password Strength Indicator */}
                        {newPassword && (
                            <div className="mt-2">
                                <div className="d-flex align-items-center mb-1">
                                    <small className={`text-${passwordStrength.color} me-2`}>
                                        {passwordStrength.text}
                                    </small>
                                    <div className="flex-grow-1 bg-light rounded" style={{height: '4px'}}>
                                        <div 
                                            className={`bg-${passwordStrength.color} rounded`}
                                            style={{
                                                height: '100%',
                                                width: `${(passwordStrength.level / 4) * 100}%`,
                                                transition: 'width 0.3s ease'
                                            }}
                                        ></div>
                                    </div>
                                </div>
                                <small className="text-muted">
                                    แนะนำ: ใช้ตัวอักษรใหญ่-เล็ก, ตัวเลข, และอักขระพิเศษ
                                </small>
                            </div>
                        )}
                    </div>

                    {/* ยืนยันรหัสผ่าน */}
                    <div className="mb-4">
                        <label className="form-label" htmlFor="confirm-password">
                            <i className="bi bi-lock-fill me-2"></i>
                            ยืนยันรหัสผ่านใหม่
                        </label>
                        <input
                            type={showPassword ? "text" : "password"}
                            className={`form-control ${confirmPassword && newPassword !== confirmPassword ? 'is-invalid' : ''}`}
                            id="confirm-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="ใส่รหัสผ่านใหม่อีกครั้ง"
                            required
                            minLength={6}
                            autoComplete="new-password"
                            disabled={submitting}
                        />
                        {confirmPassword && newPassword !== confirmPassword && (
                            <div className="invalid-feedback">
                                รหัสผ่านไม่ตรงกัน
                            </div>
                        )}
                    </div>

                    {/* แสดงข้อผิดพลาด */}
                    {error && (
                        <div className="alert alert-danger" role="alert">
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            {error}
                        </div>
                    )}

                    {/* ปุ่มส่ง */}
                    <button 
                        type="submit" 
                        className="btn btn-success w-100 mb-3" 
                        disabled={submitting || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                    >
                        {submitting ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                กำลังรีเซ็ตรหัสผ่าน...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check2-circle me-2"></i>
                                รีเซ็ตรหัสผ่าน
                            </>
                        )}
                    </button>
                </form>

                {/* 🔗 ลิงก์กลับ */}
                <div className="text-center">
                    <small>
                        <Link to="/forgot-password" className="text-decoration-none">
                            <i className="bi bi-arrow-left me-1"></i>
                            กลับไปยืนยันอีเมลใหม่
                        </Link>
                        <span className="mx-2">|</span>
                        <Link to="/login" className="text-decoration-none">
                            เข้าสู่ระบบ
                        </Link>
                    </small>
                </div>
            </div>
        </div>
    );
}