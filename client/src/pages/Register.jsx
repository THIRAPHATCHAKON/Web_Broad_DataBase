import { useState } from "react";
import { Link } from "react-router-dom";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");

  function onSubmit(e) {
    e.preventDefault();
    // TODO: เรียก API สมัครสมาชิก เช่น fetch('/api/register', { method:'POST', body: JSON.stringify({ username, email, password }) })
    console.log({ username, email, password });
  }

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="card p-4 col-11 col-sm-8 col-md-5 col-lg-4">
        <h3 className="text-center mb-3">สมัครสมาชิก</h3>

        <form id="register-form" onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="form-label">ชื่อผู้ใช้</label>
            <input
              type="text"
              className="form-control"
              id="reg-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">อีเมล</label>
            <input
              type="email"
              className="form-control"
              id="reg-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">รหัสผ่าน</label>
            <input
              type="password"
              className="form-control"
              id="reg-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-success w-100">
            สมัครสมาชิก
          </button>

          <p className="text-center mt-3">
            มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
