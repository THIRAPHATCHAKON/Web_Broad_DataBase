/*
 * ==================================================================================
 * 🚀 MAIN APP COMPONENT - คอมโพเนนต์หลักของแอปพลิเคชัน
 * ==================================================================================
 * 
 * 🎯 วัตถุประสงค์: จัดการการเส้นทาง (Routing) และ Layout หลักของเว็บไซต์
 * 🔐 ระบบความปลอดภัย: PrivateRoute สำหรับหน้าที่ต้อง Login
 * 📱 โครงสร้าง: Header + Content + Footer
 * 
 * ==================================================================================
 */

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth.jsx";

// 📄 นำเข้า Pages/หน้าต่างๆ ของแอปพลิเคชัน
import Thread from "./pages/Thread.jsx";              // หน้าแสดงกระทู้และคอมเมนต์
import Login from "./pages/Login.jsx";                // หน้าเข้าสู่ระบบ
import Register from "./pages/Register.jsx";          // หน้าสมัครสมาชิก
import New_Thread from "./pages/New_Thread.jsx";      // หน้าสร้างกระทู้ใหม่
import EditProfile from "./pages/EditProfile.jsx";    // หน้าแก้ไขโปรไฟล์
import EditThread from "./pages/EditThread.jsx";      // หน้าแก้ไขกระทู้
import ManageCategories from "./pages/ManageCategories.jsx"; // หน้าจัดการหมวดหมู่ (Admin)
import ReportList from "./pages/ReportList.jsx";      // หน้าดูรายงาน (Admin)
import ManageRoles from "./pages/ManageRoles.jsx";    // หน้าจัดการสิทธิ์ผู้ใช้ (Admin)
import Dashboard from "./pages/Dashboard.jsx";        // หน้า Dashboard (Admin)
import ForgotPassword from "./pages/ForgotPassword.jsx"; // หน้าลืมรหัสผ่าน

// 🧩 นำเข้า Components ที่ใช้ร่วมกัน
import Header from "./pages/Header.jsx";              // แถบด้านบน (เมนู, โปรไฟล์)
import Footer from "./pages/Footer.jsx";              // แถบด้านล่าง (ข้อมูลเว็บไซต์)

// 🔐 PrivateRoute - ป้องกันหน้าที่ต้องเข้าสู่ระบบ
function PrivateRoute({ children }) {
  const { user, ready } = useAuth();
  
  // 📡 รอการตรวจสอบสถานะการเข้าสู่ระบบ
  if (!ready) return <div className="p-4 text-center">กำลังโหลด...</div>;
  
  // 🚫 ถ้าไม่ได้เข้าสู่ระบบ ให้ redirect ไปหน้า login
  if (!user) return <Navigate to="/login" replace />;
  
  // ✅ ถ้าเข้าสู่ระบบแล้ว แสดงหน้านั้นๆ
  return children;
}

// 🎨 Layout Component - โครงสร้างหน้าเว็บมาตรฐาน (Header + Content + Footer)
function Layout({ children }) {
  return (
    <>
      <Header />  {/* 📋 แถบด้านบน - เมนู, โลโก้, โปรไฟล์ */}
      <main className="pt-20">{children}</main> {/* 📄 เนื้อหาหลัก - เว้น space สำหรับ fixed header */}
      <Footer />  {/* 📋 แถบด้านล่าง - ข้อมูลเว็บไซต์, ลิงก์ */}
    </>
  );
}

// 🛣️ Main App Component - กำหนดเส้นทาง (Routes) ทั้งหมดของแอปพลิเคชัน
export default function App() {
  return (
    <Routes>
      {/* 🏠 หน้าหลัก - แสดงกระทู้ทั้งหมด */}
      <Route
        path="/"
        element={<Layout><Thread /></Layout>}
      />
      <Route
        path="/thread"
        element={<Layout><Thread /></Layout>}
      />

      <Route
        path="/login"
        element={<Layout><Login /></Layout>}
      />
      <Route
        path="/register"
        element={<Layout><Register /></Layout>}
      />
      <Route
        path="/forgot-password"
        element={<Layout><ForgotPassword /></Layout>}
      />

      <Route
        path="/new_thread"
        element={
          <PrivateRoute>
            <Layout><New_Thread /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/edit_profile"
        element={
          <PrivateRoute>
            <Layout><EditProfile /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/threads/:id/edit"
        element={
          <PrivateRoute>
            <Layout><EditThread /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/manage_categories"
        element={
          <PrivateRoute>
            <Layout><ManageCategories /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/report_list"
        element={
          <PrivateRoute>
            <Layout><ReportList /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/manage_roles"
        element={
          <PrivateRoute>
            <Layout><ManageRoles /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Layout><Dashboard /></Layout>
          </PrivateRoute>
        }
      />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
