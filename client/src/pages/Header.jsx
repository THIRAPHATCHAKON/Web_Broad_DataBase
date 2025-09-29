import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Header() {
  const nav = useNavigate();
  const { user, ready, signOut } = useAuth();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/categories`)
      .then(res => res.json())
      .then(setCategories)
      .catch(err => {
        console.error("โหลดหมวดหมู่ล้มเหลว", err);
        setCategories([]);
      });
  }, []);

  if (!ready) return null;

  return (
    <header className="p-3 text-bg-dark">
      <div className="container d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-3">
          <Link to="/" className="navbar-brand text-white">Mini Forum</Link>
          {/* หมวดหมู่เป็น dropdown */}
          <div className="dropdown">
            <button
              className="btn btn-outline-light dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              หมวดหมู่
            </button>
            <ul className="dropdown-menu">
              <li>
                <Link className="dropdown-item" to="/thread">ทั้งหมด</Link>
              </li>
              {categories.length === 0 ? (
                <li><span className="dropdown-item disabled">กำลังโหลด...</span></li>
              ) : (
                categories.map(cat => (
                  <li key={cat.id}>
                    <Link className="dropdown-item" to={`/thread?category=${cat.id}`}>{cat.name}</Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        {/* ส่วนขวา: user หรือปุ่ม login/register */}
        {user ? (
          <div className="dropdown text-end">
            <a href="#" className="d-inline-flex align-items-center text-white text-decoration-none dropdown-toggle" data-bs-toggle="dropdown">
              <img
                src={`http://localhost:3000${user.avatarUrl}`}
                onError={(e) => { e.currentTarget.src = "http://localhost:3000/static/avatars/default.png"; }}
                alt="avatar"
                width="32"
                height="32"
                className="rounded-circle me-2"
              />
              <span className="small">{user.username}</span>
            </a>
            <ul className="dropdown-menu dropdown-menu-end">
              <li><Link className="dropdown-item" to="/edit_profile">EditProfile</Link></li>
              <li><hr className="dropdown-divider" /></li>
              <li><Link className="dropdown-item" to="/new_thread">New thread</Link></li>
              <li><hr className="dropdown-divider" /></li>
              {user?.role === "admin" && (
                <>
                  <li><Link className="dropdown-item" to="/report_list">รายงานกระทู้</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><Link className="dropdown-item" to="/manage_roles">เปลี่ยน Role User</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><Link className="dropdown-item" to="/dashboard">Dashboard</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><Link className="dropdown-item" to="/manage_categories">ManageCategories</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                </>
              )}
              <li>
                <button className="dropdown-item" onClick={() => { signOut(); nav("/thread", { replace: true }); }}>
                  Sign out
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <div className="d-flex gap-2">
            <Link to="/login" className="btn btn-outline-light btn-sm">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
          </div>
        )}
      </div>
    </header>
  );
}
