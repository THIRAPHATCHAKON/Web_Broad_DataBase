/*
 * ==================================================================================
 * 📋 HEADER COMPONENT - แถบเมนูด้านบน
 * ==================================================================================
 * 
 * 🎯 วัตถุประสงค์: แสดงเมนูหลัก, โลโก้, การจัดการผู้ใช้, และเมนูหมวดหมู่
 * 🔐 ระบบสิทธิ์: แสดงเมนูต่างกันตาม role (user/admin)
 * 📱 Responsive: Bootstrap navbar ที่รองรับทุกขนาดหน้าจอ
 * 
 * ==================================================================================
 */

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { useEffect, useState } from "react";

// 🌐 กำหนด API URL จาก environment variable
const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Header() {
  // 🛠️ Hooks สำหรับการนำทางและการจัดการการเข้าสู่ระบบ
  const nav = useNavigate();
  const { user, ready, signOut } = useAuth();
  
  // 📂 State สำหรับหมวดหมู่กระทู้
  const [categories, setCategories] = useState([]);           // รายการหมวดหมู่ทั้งหมด
  const [loadingCategories, setLoadingCategories] = useState(true); // สถานะการโหลดหมวดหมู่

  // 🔄 โหลดรายการหมวดหมู่เมื่อ component mount
  useEffect(() => {
    fetch(`${API}/api/categories`)
      .then(res => res.json())                               // แปลง response เป็น JSON
      .then(data => setCategories(data))                     // เก็บข้อมูลหมวดหมู่
      .catch(err => {
        console.error("โหลดหมวดหมู่ล้มเหลว", err);
        setCategories([]);                                   // ตั้งค่าเป็น array ว่างถ้าโหลดไม่สำเร็จ
      })
      .finally(() => setLoadingCategories(false));           // หยุดสถานะ loading
  }, []);

  // ⏳ รอให้ auth context พร้อมก่อนแสดง header
  if (!ready) return null;

  return (
    <>
      {/* Header fixed-top */}
      <header className="p-3 text-bg-dark fixed-top" style={{ zIndex: 1020 }}>
        <div className="container d-flex justify-content-between align-items-center">
          {/* ซ้าย: โลโก้ + หมวดหมู่ + New Thread */}
          <div className="d-flex align-items-center gap-2">
            <Link to="/" className="navbar-brand text-white">Mini Forum</Link>

            {/* Dropdown หมวดหมู่ */}
            <div className="dropdown">
              <button
                className="btn btn-sm btn-outline-light dropdown-toggle"
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
                {loadingCategories ? (
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

            {/* ปุ่มสร้างกระทู้ */}
            {user && (
              <Link to="/new_thread" className="btn btn-sm btn-success">
                สร้างกระทู้
              </Link>
            )}
          </div>

          {/* ขวา: user หรือปุ่ม login/register */}
          {user ? (
            <div className="dropdown text-end">
              <a
                href="#"
                className="d-inline-flex align-items-center text-white text-decoration-none dropdown-toggle"
                data-bs-toggle="dropdown"
              >
                <img
                  src={`${API}${user.avatarUrl}`}
                  onError={(e) => { e.currentTarget.src = `${API}/static/avatars/default.png`; }}
                  alt="avatar"
                  width="32"
                  height="32"
                  className="rounded-circle me-2"
                />
                <span className="small">{user.username}</span>
              </a>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><Link className="dropdown-item" to="/edit_profile">แก้ไขโปรไฟล์</Link></li>
                <li><hr className="dropdown-divider" /></li>
                {user?.role === "admin" && (
                  <>
                    <li><Link className="dropdown-item" to="/report_list">รายงานกระทู้</Link></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li><Link className="dropdown-item" to="/manage_roles">เปลี่ยนสิทธิ์ผู้ใช้</Link></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li><Link className="dropdown-item" to="/dashboard">แดชบอร์ด</Link></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li><Link className="dropdown-item" to="/manage_categories">จัดการหมวดหมู่</Link></li>
                    <li><hr className="dropdown-divider" /></li>
                  </>
                )}
                <li>
                  <button
                    className="dropdown-item"
                    onClick={async () => { await signOut(); nav("/thread", { replace: true }); }}
                  >
                    ออกจากระบบ
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <div className="d-flex gap-2">
              <Link to="/login" className="btn btn-sm btn-outline-light">เข้าสู่ระบบ</Link>
              <Link to="/register" className="btn btn-sm btn-primary">สมัครสมาชิก</Link>
            </div>
          )}
        </div>
      </header>

      {/* เพิ่ม margin-top ให้เนื้อหาไม่ถูกทับ Header */}
      <div style={{ marginTop: "70px" }} />
    </>
  );
}
