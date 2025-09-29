/*
 * ==================================================================================
 * 🔐 AUTHENTICATION CONTEXT - ระบบจัดการการเข้าสู่ระบบ
 * ==================================================================================
 * 
 * 🎯 วัตถุประสงค์: จัดการ state การเข้าสู่ระบบทั่วทั้งแอปพลิเคชัน
 * 💾 การเก็บข้อมูล: localStorage (คงอยู่แม้ปิดเบราว์เซอร์)
 * 🔄 การใช้งาน: useAuth hook สำหรับเข้าถึงข้อมูลผู้ใช้
 * 
 * ==================================================================================
 */

import { createContext, useContext, useEffect, useState } from "react";

// 🎭 สร้าง Context สำหรับแชร์ข้อมูลการเข้าสู่ระบบ
const AuthContext = createContext();

// 🏭 AuthProvider - Component ที่ห้อหุ้มแอปทั้งหมดเพื่อให้เข้าถึง auth state
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);        // 👤 ข้อมูลผู้ใช้ปัจจุบัน (null = ไม่ได้เข้าสู่ระบบ)
  const [ready, setReady] = useState(false);     // 📡 สถานะการโหลดข้อมูลเสร็จแล้ว

  // 🚀 เมื่อ component mount, ตรวจสอบ localStorage ว่ามีข้อมูลการเข้าสู่ระบบหรือไม่
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");   // 📖 อ่านข้อมูลจาก localStorage
      if (raw) setUser(JSON.parse(raw));          // 🔄 แปลง JSON string กลับเป็น object
    } finally {
      setReady(true);                             // ✅ แจ้งว่าตรวจสอบเสร็จแล้ว
    }
  }, []);

  // 🔓 ฟังก์ชันเข้าสู่ระบบ - เก็บข้อมูลใน localStorage และ state
  const signIn = (u) => { 
    localStorage.setItem("user", JSON.stringify(u)); 
    setUser(u); 
  };
  
  // 🚪 ฟังก์ชันออกจากระบบ - ลบข้อมูลจาก localStorage และ state
  const signOut = () => { 
    localStorage.removeItem("user"); 
    setUser(null); 
  };

  // 🎁 ส่งข้อมูลและฟังก์ชันให้ component ลูกใช้งาน
  return (
    <AuthContext.Provider value={{ user, ready, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// 🪝 Custom Hook สำหรับเข้าถึง AuthContext อย่างง่ายดาย
export const useAuth = () => useContext(AuthContext);
