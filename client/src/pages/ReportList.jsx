/*
 * ==================================================================================
 * 🚨 REPORT LIST PAGE - หน้ารายการรายงานกระทู้ (Admin Only)  
 * ==================================================================================
 * 
 * 🎯 วัตถุประสงค์: ให้ Admin ดูและจัดการรายงานกระทู้ที่ไม่เหมาะสม
 * 🔐 ความปลอดภัย: เฉพาะ Admin เท่านั้นที่เข้าถึงได้
 * 📊 ฟีเจอร์: ดูรายงาน, แก้ไขเหตุผล, ลบรายงาน, Debug mode
 * 
 * ==================================================================================
 */

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../auth.jsx";
import Header from "./Header";
import Footer from "./Footer";

// 🌐 กำหนด API URL จาก environment variable
const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function ReportList() {
  // 🛠️ Authentication และ user management
  const { user } = useAuth();                         // ข้อมูลผู้ใช้ปัจจุบัน (ต้องเป็น admin)
  
  // 📊 Main content states - ข้อมูลรายงาน
  const [reports, setReports] = useState([]);        // รายการรายงานทั้งหมด
  
  // ✏️ Edit functionality states - การแก้ไขรายงาน
  const [editingReport, setEditingReport] = useState(null);  // ID ของรายงานที่กำลังแก้ไข
  const [editReason, setEditReason] = useState("");          // เหตุผลใหม่ที่กำลังแก้ไข
  
  // 🎛️ UI control states - ควบคุม UI
  const [loading, setLoading] = useState(false);             // สถานะการดำเนินการ (แก้ไข/ลบ)
  const [pageLoading, setPageLoading] = useState(true);      // สถานะการโหลดหน้า
  const [error, setError] = useState(null);                  // ข้อความแสดงข้อผิดพลาด

  // 📡 ฟังก์ชันโหลดรายการรายงานจากเซิร์ฟเวอร์
  const loadReports = useCallback(async () => {
    try {
      // 🔍 Debug logging เพื่อตรวจสอบปัญหาการเชื่อมต่อ
      console.log('=== Loading Reports Debug ===');
      console.log('API URL:', API);
      console.log('User:', user);
      console.log('User token exists:', !!user?.token);
      
      // 🔐 ตรวจสอบ authentication token
      if (!user?.token) {
        throw new Error('ไม่พบ token สำหรับการเข้าถึง');
      }
      
      // 🎛️ ตั้งค่าสถานะเริ่มต้น
      setPageLoading(true);
      setError(null);
      
      // 🏥 ทดสอบการเชื่อมต่อเบื้องต้นกับ health check
      try {
        const pingRes = await fetch(`${API}/api/health`).catch(() => null);
        console.log('Health check:', pingRes?.ok ? 'OK' : 'Failed');
      } catch (e) {
        console.log('Health check failed:', e);
      }
      
      // 🔧 ตั้งค่า request headers พร้อม authentication
      const headers = { 
        "Authorization": `Bearer ${user.token}`,    // JWT token สำหรับตรวจสอบสิทธิ์ admin
        "Content-Type": "application/json"
      };
      console.log('Request URL:', `${API}/api/reports`);
      console.log('Request headers:', headers);
      
      // 📡 ส่งคำขอไปยัง API เพื่อดึงรายการรายงาน
      const res = await fetch(`${API}/api/reports`, { 
        headers,
        method: 'GET'                             // ใช้ GET method
      });
      
      // 🔍 Log ข้อมูล response สำหรับ debugging
      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);
      console.log('Response headers:', res.headers);

      // 🚨 จัดการ HTTP error status codes
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Response error text:', errorText);
        
        // 🔐 401 Unauthorized - ไม่มีสิทธิ์เข้าถึง
        if (res.status === 401) {
          throw new Error('ไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบใหม่');
        } 
        // 🔍 404 Not Found - ไม่พบ API endpoint
        else if (res.status === 404) {
          throw new Error('ไม่พบ API endpoint');
        } 
        // 💥 500 Internal Server Error - เซิร์ฟเวอร์มีปัญหา
        else if (res.status === 500) {
          throw new Error('เซิร์ฟเวอร์มีปัญหา');
        } 
        // ❌ HTTP errors อื่นๆ
        else {
          throw new Error(`HTTP ${res.status}: ${errorText || 'Server Error'}`);
        }
      }

      // 📊 แปลง response เป็น JSON และ log ข้อมูล
      const data = await res.json();
      console.log('Response data:', data);
      console.log('Reports array:', data.reports);
      
      // 🔄 จัดการรูปแบบ response ที่แตกต่างกัน (flexibility)
      let reportsArray = [];
      if (Array.isArray(data)) {
        // กรณีที่ server ส่ง array โดยตรง
        reportsArray = data;
      } else if (data.reports && Array.isArray(data.reports)) {
        // กรณีที่ server ส่ง object พร้อม reports property
        reportsArray = data.reports;
      } else if (data.data && Array.isArray(data.data)) {
        // กรณีที่ server ส่ง object พร้อม data property
        reportsArray = data.data;
      }
      
      console.log('Final reports array:', reportsArray);
      setReports(reportsArray);                         // อัปเดต state ด้วยข้อมูลรายงาน
      
    } catch (error) {
      // 💥 จัดการข้อผิดพลาดและแสดงข้อความที่เข้าใจง่าย
      console.error('Error loading reports:', error);
      setError(error.message || 'ไม่สามารถโหลดรายงานได้');
      setReports([]);                                   // ล้างข้อมูลรายงานเดิม
    } finally {
      setPageLoading(false);                            // หยุดสถานะ loading ไม่ว่าจะสำเร็จหรือไม่
    }
  }, [user]);

  // ⏰ Timeout สำหรับป้องกันการโหลดค้างนานเกินไป (10 วินาที)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (pageLoading) {
        console.warn('Loading timeout reached');
        setError('การโหลดใช้เวลานานเกินไป กรุณาลองใหม่');
        setPageLoading(false);
      }
    }, 10000);                                          // 10 วินาที timeout

    return () => clearTimeout(timeout);                 // ล้าง timeout เมื่อ component unmount
  }, [pageLoading]);

  useEffect(() => {
    console.log('ReportList useEffect - user:', user);
    if (user?.token) {
      console.log('User has token, loading reports...');
      loadReports();
    } else {
      console.log('No user or token, setting page loading to false');
      setPageLoading(false);
    }
  }, [user, loadReports]);

  // 🗑️ ฟังก์ชันลบรายงาน
  const handleDelete = async (reportId) => {
    // 🛡️ ยืนยันการลบก่อนดำเนินการ
    if (!window.confirm("ยืนยันการลบรายงานนี้?")) return;
    
    setLoading(true);                                   // ตั้งสถานะ loading
    try {
      // 📡 ส่งคำขอ DELETE ไปยังเซิร์ฟเวอร์
      const res = await fetch(`${API}/api/reports/${reportId}`, {
        method: "DELETE",                               // ใช้ DELETE method
        headers: { "Authorization": `Bearer ${user.token}` } // ส่ง token สำหรับตรวจสอบสิทธิ์
      });

      // 🚨 ตรวจสอบความสำเร็จของการลบ
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "ลบรายงานไม่สำเร็จ" }));
        throw new Error(errorData.message || "ลบรายงานไม่สำเร็จ");
      }

      // ✅ ลบสำเร็จ - อัปเดต state ใน frontend
      setReports(prev => prev.filter(r => r._id !== reportId)); // ลบออกจาก array
      alert("ลบรายงานสำเร็จ");
    } catch (error) {
      // ❌ จัดการข้อผิดพลาดและแสดงข้อความ
      console.error('Error deleting report:', error);
      alert(error.message || "เกิดข้อผิดพลาดในการลบรายงาน");
    } finally {
      setLoading(false);                                // หยุดสถานะ loading
    }
  };

  // ✏️ ฟังก์ชันเริ่มการแก้ไขรายงาน
  const handleEdit = (report) => {
    setEditingReport(report._id);                       // ตั้ง ID ของรายงานที่กำลังแก้ไข
    setEditReason(report.reason);                       // ใส่เหตุผลเดิมลงในช่อง input
  };

  // 💾 ฟังก์ชันบันทึกการแก้ไขรายงาน
  const handleSaveEdit = async (reportId) => {
    // 🔍 ตรวจสอบว่ามีเหตุผลใหม่หรือไม่
    if (!editReason.trim()) {
      alert("กรุณาระบุเหตุผลในการรายงาน");
      return;
    }

    setLoading(true);                                   // ตั้งสถานะ loading
    try {
      // 📡 ส่งคำขอ PUT เพื่ออัปเดตรายงาน
      const res = await fetch(`${API}/api/reports/${reportId}`, {
        method: "PUT",                                  // ใช้ PUT method สำหรับการอัปเดต
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`       // ส่ง token สำหรับตรวจสอบสิทธิ์
        },
        body: JSON.stringify({ reason: editReason.trim() }) // ส่งเหตุผลใหม่
      });

      // 🚨 ตรวจสอบความสำเร็จของการแก้ไข
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "แก้ไขรายงานไม่สำเร็จ" }));
        throw new Error(errorData.message || "แก้ไขรายงานไม่สำเร็จ");
      }

      await res.json();
      
      // ✅ แก้ไขสำเร็จ - อัปเดต state ใน frontend
      setReports(prev => prev.map(r => 
        r._id === reportId ? { ...r, reason: editReason.trim() } : r
      ));
      
      // 🧹 ล้างสถานะการแก้ไข
      setEditingReport(null);
      setEditReason("");
      alert("แก้ไขรายงานสำเร็จ");
    } catch (error) {
      // ❌ จัดการข้อผิดพลาดและแสดงข้อความ
      console.error('Error updating report:', error);
      alert(error.message || "เกิดข้อผิดพลาดในการแก้ไขรายงาน");
    } finally {
      setLoading(false);                                // หยุดสถานะ loading
    }
  };

  // 🚫 ฟังก์ชันยกเลิกการแก้ไข
  const handleCancelEdit = () => {
    setEditingReport(null);                             // ยกเลิกการแก้ไข
    setEditReason("");                                  // ล้างเหตุผลที่พิมพ์ไว้
  };

  // Loading page
  if (pageLoading) {
    return (
      <div className="d-flex flex-column min-vh-100">
        <Header />
        <main className="flex-grow-1 d-flex align-items-center justify-content-center">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">กำลังโหลด...</span>
            </div>
            <p className="text-muted">กำลังโหลดรายการรายงาน...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error page
  if (error) {
    return (
      <div className="d-flex flex-column min-vh-100">
        <Header />
        <main className="flex-grow-1 d-flex align-items-center justify-content-center">
          <div className="text-center">
            <div className="alert alert-danger" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <h5>เกิดข้อผิดพลาด</h5>
              <p className="mb-3">{error}</p>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setError(null);
                  loadReports();
                }}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                ลองใหม่
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Check if user is not logged in (only show this if not loading)
  if (!pageLoading && (!user || !user.token)) {
    return (
      <div className="d-flex flex-column min-vh-100">
        <Header />
        <main className="flex-grow-1 d-flex align-items-center justify-content-center">
          <div className="text-center">
            <div className="alert alert-warning" role="alert">
              <i className="bi bi-person-x me-2"></i>
              <h5>จำเป็นต้องเข้าสู่ระบบ</h5>
              <p>กรุณาเข้าสู่ระบบเพื่อดูรายการรายงาน</p>
              <button 
                className="btn btn-primary mt-2"
                onClick={() => window.location.href = '/login'}
              >
                <i className="bi bi-box-arrow-in-right me-1"></i>
                เข้าสู่ระบบ
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <main className="flex-grow-1">
        <div className="container py-4">
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div className="d-flex align-items-center">
              <h3 className="mb-0">
                <i className="bi bi-flag-fill text-warning me-2"></i>
                รายการรายงานกระทู้
              </h3>
              <span className="badge bg-primary ms-3">{reports.length} รายการ</span>
            </div>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  console.log('Debug Info:');
                  console.log('- User:', user);
                  console.log('- API URL:', API);
                  console.log('- Reports:', reports);
                  console.log('- Page Loading:', pageLoading);
                  console.log('- Error:', error);
                  alert('ข้อมูล debug แสดงใน Console (F12)');
                }}
              >
                <i className="bi bi-bug me-1"></i>
                Debug
              </button>
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={() => {
                  setError(null);
                  loadReports();
                }}
                disabled={pageLoading}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                รีเฟรช
              </button>
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="alert alert-info text-center">
              <i className="bi bi-info-circle me-2"></i>
              ยังไม่มีรายงานใดๆ
            </div>
          ) : (
            <div className="row g-3">
              {reports.map(r => (
                <div className="col-12" key={r._id}>
                  <div className="card shadow-sm">
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-8">
                          <h6 className="card-title text-primary">
                            <i className="bi bi-chat-square-text me-1"></i>
                            {r.threadTitle}
                          </h6>
                          <p className="text-muted small mb-2">
                            <i className="bi bi-hash me-1"></i>
                            ID กระทู้: {r.threadId}
                          </p>
                          <p className="mb-2">
                            <i className="bi bi-person-fill me-1"></i>
                            <strong>รายงานโดย:</strong> {r.reporterEmail}
                          </p>
                          
                          {/* เหตุผลการรายงาน */}
                          <div className="mb-2">
                            <i className="bi bi-exclamation-triangle-fill text-warning me-1"></i>
                            <strong>เหตุผล:</strong>
                            {editingReport === r._id ? (
                              <div className="mt-2">
                                <textarea
                                  className="form-control"
                                  rows={3}
                                  value={editReason}
                                  onChange={(e) => setEditReason(e.target.value)}
                                  placeholder="ระบุเหตุผลในการรายงาน..."
                                  disabled={loading}
                                />
                              </div>
                            ) : (
                              <span className="ms-1">{r.reason}</span>
                            )}
                          </div>
                          
                          <small className="text-muted">
                            <i className="bi bi-clock me-1"></i>
                            {new Date(r.createdAt).toLocaleString('th-TH')}
                          </small>
                        </div>
                        
                        {/* ปุ่มจัดการ */}
                        <div className="col-md-4 d-flex flex-column gap-2">
                          {editingReport === r._id ? (
                            <>
                              <button
                                className="btn btn-success btn-sm d-flex align-items-center justify-content-center"
                                onClick={() => handleSaveEdit(r._id)}
                                disabled={loading || !editReason.trim()}
                              >
                                {loading ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                    <i className="bi bi-check2 me-1"></i>
                                    กำลังบันทึก...
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-check-circle-fill me-1"></i>
                                    บันทึก
                                  </>
                                )}
                              </button>
                              <button
                                className="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center"
                                onClick={handleCancelEdit}
                                disabled={loading}
                              >
                                <i className="bi bi-x-circle me-1"></i>
                                ยกเลิก
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-center"
                                onClick={() => handleEdit(r)}
                                disabled={loading}
                                title="แก้ไขเหตุผลการรายงาน"
                              >
                                <i className="bi bi-pencil-square me-1"></i>
                                แก้ไข
                              </button>
                              <button
                                className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center"
                                onClick={() => handleDelete(r._id)}
                                disabled={loading}
                                title="ลบรายงานนี้"
                              >
                                <i className="bi bi-trash3-fill me-1"></i>
                                ลบ
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}