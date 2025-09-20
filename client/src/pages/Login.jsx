import { useState } from "react";
import { Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function onSubmit(e) {
    e.preventDefault();
    // TODO: เรียก API เข้าสู่ระบบ เช่น fetch('/api/login', { method:'POST', body: JSON.stringify({ email, password }) })
    console.log({ email, password });
  }

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="card p-4 col-11 col-sm-8 col-md-5 col-lg-4">
        <h3 className="text-center mb-3">เข้าสู่ระบบ</h3>

        <form id="login-form" onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="form-label">อีเมล</label>
            <input
              type="email"
              className="form-control"
              id="login-email"
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
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-100">
            เข้าสู่ระบบ
          </button>

          <p className="text-center mt-3">
            ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
