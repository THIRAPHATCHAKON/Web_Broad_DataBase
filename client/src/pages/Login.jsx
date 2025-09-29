import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx"; // 👈 path ให้ตรงไฟล์จริง
export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth(); // 👈 ใช้ context

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.message || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");

      // 👇 อัปเดต context + localStorage ภายใน signIn
      signIn(data.user);

      navigate("/thread", { replace: true });
    } catch (err) {
      alert(err.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="card p-4 col-11 col-sm-8 col-md-5 col-lg-4">
        <h3 className="text-center mb-3">เข้าสู่ระบบ</h3>
        <form id="login-form" onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="login-email">ชื่อผู้ใช้</label>
            <input type="text" className="form-control" id="reg-username"
              value={username} onChange={(e) => setUsername(e.target.value)}
              required autoComplete="username" />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="login-password">รหัสผ่าน</label>
            <input type="password" className="form-control" id="login-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
            {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
          <p className="text-center mt-3">
            ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link> <Link to="/forgot-password">ลืมรหัสผ่าน?</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
