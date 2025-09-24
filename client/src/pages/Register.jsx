import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [username, setUsername]         = useState("");
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [confirmPassword, setConfirm]   = useState("");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    // ตรวจง่ายๆ ก่อนยิง API
    if (password.length < 6) return setError("รหัสผ่านอย่างน้อย 6 ตัวอักษร");
    if (password !== confirmPassword) return setError("ยืนยันรหัสผ่านไม่ตรงกัน");
    if (!username.trim()) return setError("กรอกชื่อผู้ใช้");

    try {
      setLoading(true);
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
