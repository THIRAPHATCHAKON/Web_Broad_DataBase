import { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [message, setMessage] = useState("");

    async function onSubmit(e) {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);

        try {
            const res = await fetch("/api/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), newPassword}),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || "เกิดข้อผิดพลาด");

            setMessage("ลิงก์รีเซ็ตรหัสผ่านถูกส่งไปยังอีเมลของคุณแล้ว");
        } catch (err) {
            alert(err.message || "เกิดข้อผิดพลาด");
        } finally {
            setSubmitting(false);
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
