/*
 * ==================================================================================
 * 📋 FOOTER COMPONENT - แถบด้านล่างของเว็บไซต์
 * ==================================================================================
 * 
 * 🎯 วัตถุประสงค์: แสดงข้อมูลลิขสิทธิ์และข้อมูลเว็บไซต์
 * 🎨 ดีไซน์: Simple footer พร้อม border บน และ copyright
 * 📱 Responsive: ใช้ Bootstrap classes สำหรับทุกขนาดหน้าจอ
 * 
 * ==================================================================================
 */

function Footer() {
  return (
    <footer className="border-top mt-auto">  {/* เส้นขอบด้านบน, margin-top อัตโนมัติ */}
      <div className="container py-3 text-muted small">
        © 2025 Mini Forum {/* ข้อความลิขสิทธิ์ */}
      </div>
    </footer>
  );
}

export default Footer;