/*
 * ==================================================================================
 * 💬 THREAD PAGE - หน้าแสดงกระทู้และคอมเมนต์หลัก
 * ==================================================================================
 * 
 * 🎯 วัตถุประสงค์: แสดงรายการกระทู้, คอมเมนต์, ค้นหา, และจัดการเนื้อหา
 * 🔍 ฟีเจอร์: Search, Filter by category, CRUD comments, Image upload
 * 📱 UX/UI: Responsive design, Real-time updates, Loading states
 * 
 * ==================================================================================
 */

import Header from "./Header";
import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";

// 🌐 กำหนด API URL จาก environment variable หรือใช้ default
const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Thread() {
  // 🛠️ Router และ URL management
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const category = params.get("category");                    // ดึงหมวดหมู่จาก query parameter
  const user = JSON.parse(localStorage.getItem("user") || "{}"); // ข้อมูลผู้ใช้ปัจจุบัน

  // 📝 Main content states - ข้อมูลหลักของหน้า
  const [threads, setThreads] = useState([]);               // รายการกระทู้ทั้งหมด
  const [loading, setLoading] = useState(true);             // สถานะการโหลดข้อมูล
  
  // 💬 Comment management states - จัดการคอมเมนต์
  const [comment, setComment] = useState({});               // คอมเมนต์ใหม่ที่กำลังพิมพ์
  const [commentImages, setCommentImages] = useState({});   // รูปภาพสำหรับคอมเมนต์ใหม่
  const [editingComment, setEditingComment] = useState({}); // คอมเมนต์ที่กำลังแก้ไข
  const [editingCommentImages, setEditingCommentImages] = useState({}); // รูปภาพสำหรับแก้ไขคอมเมนต์
  
  // 🎯 DOM references - อ้างอิง element ใน DOM
  const commentRefs = useRef({});                           // Reference ไปยัง textarea ของแต่ละกระทู้
  const fileInputRefs = useRef({});                        // Reference ไปยัง file input สำหรับรูปใหม่
  const editFileInputRefs = useRef({});                    // Reference ไปยัง file input สำหรับแก้ไข

  // 📊 Sidebar content states - ข้อมูลแถบข้าง
  const [dateTime, setDateTime] = useState(new Date());     // เวลาปัจจุบัน
  const [hotThreads, setHotThreads] = useState([]);        // กระทู้ยอดนิยม
  const [hotCategories, setHotCategories] = useState([]);  // หมวดหมู่ยอดนิยม
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date()); // วันที่ในปฏิทิน
  
  // 🔍 Search functionality - ระบบค้นหา
  const [searchQuery, setSearchQuery] = useState("");       // คำค้นหาที่ผู้ใช้พิมพ์
  const [filteredThreads, setFilteredThreads] = useState([]); // กระทู้ที่กรองแล้ว
  const [isSearching, setIsSearching] = useState(false);

  // โหลด threads พร้อม comments
  useEffect(() => {
    const loadThreads = async () => {
      setLoading(true);
      try {
        let url = `${API}/api/threads`;
        if (category) url += `?category=${category}`;

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        const items = data.items || [];
        
        const threadsWithComments = await Promise.all(items.map(async t => {
          try {
            const rc = await fetch(`${API}/api/threads/${t.id}/comments`);
            if (rc.ok) {
              const commentsData = await rc.json();
              return { ...t, comments: commentsData.items || commentsData.comments || [] };
            }
          } catch {
            // Ignore error and return thread without comments
          }
          return { ...t, comments: [] };
        }));

        setThreads(threadsWithComments);
        setFilteredThreads(threadsWithComments); // ✅ อัพเดต filtered threads ด้วย
      } catch (error) {
        console.error('Error loading threads:', error);
        setThreads([]);
        setFilteredThreads([]);
      } finally {
        setLoading(false);
      }
    };

    loadThreads();
  }, [category]);

  // ✅ อัปเดตเวลา real-time
  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ✅ Keyboard shortcut สำหรับการค้นหา (Ctrl+K หรือ Cmd+K)
  useEffect(() => {
    const handleKeyboard = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="ค้นหากระทู้"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      // ESC เพื่อล้างการค้นหา
      if (e.key === 'Escape' && searchQuery) {
        clearSearch();
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [searchQuery]);

  // ✅ ระบบค้นหาแบบ real-time
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredThreads(threads);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const searchTimer = setTimeout(() => {
      const query = searchQuery.toLowerCase().trim();
      const filtered = threads.filter(thread => 
        thread.title.toLowerCase().includes(query) ||
        thread.body.toLowerCase().includes(query) ||
        thread.author?.username?.toLowerCase().includes(query) ||
        thread.author?.email?.toLowerCase().includes(query) ||
        thread.tags?.toLowerCase().includes(query)
      );
      setFilteredThreads(filtered);
      setIsSearching(false);
    }, 300); // debounce 300ms

    return () => clearTimeout(searchTimer);
  }, [searchQuery, threads]);

  // ✅ โหลด Hot Threads และ Hot Categories
  useEffect(() => {
    const loadSidebarData = async () => {
      try {
        // โหลด Hot Threads
        const threadsRes = await fetch(`${API}/api/threads?sort=popular&limit=5`);
        if (threadsRes.ok) {
          const threadsData = await threadsRes.json();
          setHotThreads(threadsData.items || []);
        }
      } catch (error) {
        console.error('Error loading hot threads:', error);
        setHotThreads([]);
      }

      try {
        // โหลด Hot Categories
        const categoriesRes = await fetch(`${API}/api/categories?sort=popular&limit=5`);
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setHotCategories(categoriesData.items || []);
        }
      } catch (error) {
        console.error('Error loading hot categories:', error);
        setHotCategories([]);
      }
    };

    loadSidebarData();
  }, []);

  // ✅ ฟังก์ชันสำหรับปฏิทิน
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    
    // หาวันจันทร์แรกของสัปดาห์ที่มีวันที่ 1
    startDate.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1));
    
    const days = [];
    const currentDate = new Date(startDate);
    
    // สร้างปฏิทิน 6 สัปดาห์ (42 วัน)
    for (let i = 0; i < 42; i++) {
      days.push({
        date: new Date(currentDate),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: 
          currentDate.getDate() === dateTime.getDate() &&
          currentDate.getMonth() === dateTime.getMonth() &&
          currentDate.getFullYear() === dateTime.getFullYear()
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const previousMonth = () => {
    setCurrentCalendarDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const nextMonth = () => {
    setCurrentCalendarDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const calendarDays = getDaysInMonth(currentCalendarDate);

  // ✅ ฟังก์ชันจัดการการค้นหา
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  // ✅ ฟังก์ชันไฮไลต์คำค้นหา
  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm.trim() || !text) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="search-highlight">{part}</span>
      ) : (
        part
      )
    );
  };

  const handleDelete = async (id) => {
    if (!window.confirm("ยืนยันการลบกระทู้?")) return;
    
    try {
      const res = await fetch(`${API}/api/threads/${id}?userId=${user.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${user.token}` }
      });
      
      if (!res.ok) {
        let errorMessage = "ลบไม่สำเร็จ";
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Use default error message if JSON parsing fails
        }
        throw new Error(errorMessage);
      }

      // Remove thread from state
      setThreads(prev => prev.filter(t => t.id !== id));
      
    } catch (error) {
      console.error('Error deleting thread:', error);
      alert(error.message || "เกิดข้อผิดพลาดในการลบกระทู้");
    }
  };

  // ✅ ฟังก์ชันจัดการรูปภาพ
  const handleImageSelect = (threadId, file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCommentImages(prev => ({
          ...prev,
          [threadId]: {
            file: file,
            preview: e.target.result
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (threadId) => {
    setCommentImages(prev => {
      const newImages = { ...prev };
      delete newImages[threadId];
      return newImages;
    });
    if (fileInputRefs.current[threadId]) {
      fileInputRefs.current[threadId].value = '';
    }
  };

  // ✅ อัพเดท handleComment function
  const handleComment = async (threadId) => {
    const commentText = comment[threadId]?.trim();
    const commentImage = commentImages[threadId];
    
    if (!commentText && !commentImage) {
      alert("กรุณาใส่ข้อความหรือรูปภาพ");
      return;
    }
    
    try {
      const formData = new FormData();
      if (commentText) formData.append('body', commentText);
      if (commentImage?.file) formData.append('image', commentImage.file);

      const res = await fetch(`${API}/api/threads/${threadId}/comments`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user?.token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "เกิดข้อผิดพลาดในการส่งคอมเมนต์" }));
        throw new Error(errorData.message || "คอมเมนต์ไม่สำเร็จ");
      }

      const data = await res.json();
      if (!data?.ok) {
        throw new Error(data?.message || "คอมเมนต์ไม่สำเร็จ");
      }

      // รีโหลด comments ของ thread นี้ใหม่
      try {
        const rc = await fetch(`${API}/api/threads/${threadId}/comments`, {
          headers: { "Authorization": `Bearer ${user?.token}` }
        });
        if (rc.ok) {
          const commentsData = await rc.json();
          const list = commentsData.items || commentsData.comments || [];
          setThreads(prev => prev.map(t => t.id === threadId ? { ...t, comments: list } : t));

          // Scroll to bottom of comments
          setTimeout(() => {
            const container = commentRefs.current[threadId];
            if (container) container.scrollTop = container.scrollHeight;
          }, 100);
        }
      } catch (error) {
        console.error('Error reloading comments:', error);
      }

      // Clear inputs
      setComment(prev => ({ ...prev, [threadId]: "" }));
      removeImage(threadId);
      
    } catch (error) {
      console.error('Error posting comment:', error);
      alert(error.message || "เกิดข้อผิดพลาดในการส่งคอมเมนต์");
    }
  };

  // ✅ ฟังก์ชันลบคอมเมนต์
  const handleDeleteComment = async (commentId, threadId) => {
    if (!window.confirm("ยืนยันการลบคอมเมนต์?")) return;
    
    try {
      const response = await fetch(`${API}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        // รีโหลดคอมเมนต์สำหรับกระทู้นี้
        const commentsResponse = await fetch(`${API}/api/threads/${threadId}/comments`);
        if (commentsResponse.ok) {
          const { items: comments } = await commentsResponse.json();
          setThreads(prev => prev.map(t => 
            t.id === threadId ? { ...t, comments } : t
          ));
        }
        alert("ลบคอมเมนต์สำเร็จ");
      } else {
        const error = await response.json();
        throw new Error(error.message || "ไม่สามารถลบคอมเมนต์ได้");
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert(error.message || "เกิดข้อผิดพลาดในการลบคอมเมนต์");
    }
  };

  // ✅ ฟังก์ชันเริ่มแก้ไขคอมเมนต์
  const startEditComment = (commentId, currentBody) => {
    setEditingComment(prev => ({ ...prev, [commentId]: currentBody }));
  };

  // ✅ ฟังก์ชันยกเลิกการแก้ไข
  const cancelEditComment = (commentId) => {
    setEditingComment(prev => {
      const newState = { ...prev };
      delete newState[commentId];
      return newState;
    });
    setEditingCommentImages(prev => {
      const newState = { ...prev };
      delete newState[commentId];
      return newState;
    });
  };

  // ✅ ฟังก์ชันจัดการรูปภาพสำหรับการแก้ไข
  const handleEditImageSelect = (commentId, file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditingCommentImages(prev => ({
          ...prev,
          [commentId]: {
            file: file,
            preview: e.target.result
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeEditImage = (commentId) => {
    setEditingCommentImages(prev => {
      const newState = { ...prev };
      delete newState[commentId];
      return newState;
    });
    if (editFileInputRefs.current[commentId]) {
      editFileInputRefs.current[commentId].value = '';
    }
  };

  // ✅ ฟังก์ชันบันทึกการแก้ไขคอมเมนต์
  const handleUpdateComment = async (commentId, threadId) => {
    const commentText = editingComment[commentId]?.trim();
    const commentImage = editingCommentImages[commentId];
    
    if (!commentText && !commentImage) {
      alert("กรุณาใส่ข้อความหรือรูปภาพ");
      return;
    }
    
    try {
      const formData = new FormData();
      if (commentText) {
        formData.append('body', commentText);
      }
      if (commentImage) {
        formData.append('image', commentImage.file);
      }

      const response = await fetch(`${API}/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
        body: formData,
      });

      if (response.ok) {
        // รีโหลดคอมเมนต์สำหรับกระทู้นี้
        const commentsResponse = await fetch(`${API}/api/threads/${threadId}/comments`);
        if (commentsResponse.ok) {
          const { items: comments } = await commentsResponse.json();
          setThreads(prev => prev.map(t => 
            t.id === threadId ? { ...t, comments } : t
          ));
        }
        
        // ล้างข้อมูลการแก้ไข
        cancelEditComment(commentId);
        alert("แก้ไขคอมเมนต์สำเร็จ");
      } else {
        const error = await response.json();
        throw new Error(error.message || "ไม่สามารถแก้ไขคอมเมนต์ได้");
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      alert(error.message || "เกิดข้อผิดพลาดในการแก้ไขคอมเมนต์");
    }
  };

  if (loading) return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <main className="flex-grow-1 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">กำลังโหลด...</span>
          </div>
          <p className="text-muted">กำลังโหลดกระทู้...</p>
        </div>
      </main>
    </div>
  );

  return (
    <>
      <style>{`
        .calendar-table {
          width: 100%;
        }
        .calendar-table td {
          width: 14.28%;
          vertical-align: middle;
        }
        .calendar-table th {
          width: 14.28%;
          height: 25px;
          border-bottom: 1px solid #dee2e6;
        }
        .calendar-day {
          transition: all 0.2s ease;
          margin: 1px;
          border: 1px solid transparent;
        }
        .calendar-day:hover:not(.bg-primary) {
          background-color: #e9ecef !important;
          border-color: #6c757d !important;
          transform: scale(1.05);
        }
        .calendar-day:hover.bg-primary {
          background-color: #0056b3 !important;
          transform: scale(1.05);
        }
        .calendar-today {
          box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.3);
          border: 2px solid #0d6efd !important;
        }
        .calendar-table tbody tr {
          height: 45px;
        }
        .comment-image-preview {
          max-width: 100px;
          max-height: 80px;
          object-fit: cover;
          border-radius: 8px;
        }
        .comment-image {
          max-width: 250px;
          max-height: 200px;
          object-fit: cover;
          border-radius: 8px;
          cursor: pointer;
        }
        .image-upload-btn {
          border: 2px dashed #dee2e6;
          background: #f8f9fa;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .image-upload-btn:hover {
          border-color: #007bff;
          background: #e3f2fd;
        }
        .search-highlight {
          background-color: yellow;
          font-weight: bold;
          padding: 1px 3px;
          border-radius: 3px;
        }
        .search-input {
          transition: all 0.3s ease;
        }
        .search-input:focus {
          box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.25);
          border-color: #0d6efd;
        }
      `}</style>
      
      <div className="d-flex flex-column min-vh-100">
        <Header />
        <main className="flex-grow-1">
          <div className="container my-4">
            <div className="row">
              <div className="col-md-8">
                {/* ✅ ช่องค้นหา */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">กระทู้</h5>
                  <div className="d-flex align-items-center gap-2" style={{ minWidth: "300px" }}>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-search"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control search-input"
                        placeholder="ค้นหากระทู้, เนื้อหา, ผู้เขียน... (Ctrl+K)"
                        value={searchQuery}
                        onChange={handleSearch}
                        title="ใช้ Ctrl+K เพื่อ focus, ESC เพื่อล้าง"
                      />
                      {searchQuery && (
                        <button
                          className="btn btn-outline-secondary"
                          type="button"
                          onClick={clearSearch}
                          title="ล้างการค้นหา"
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ✅ แสดงสถานะการค้นหา */}
                {(searchQuery || category) && (
                  <div className="mb-3 d-flex flex-wrap gap-2">
                    {searchQuery && (
                      <small className="text-muted">
                        {isSearching ? (
                          <><i className="spinner-border spinner-border-sm me-1"></i>กำลังค้นหา...</>
                        ) : (
                          <>🔍 พบ {filteredThreads.length} กระทู้จากการค้นหา "{searchQuery}"</>
                        )}
                      </small>
                    )}
                    {category && (
                      <small className="badge bg-primary">📂 หมวดหมู่: {category}</small>
                    )}
                  </div>
                )}

                {filteredThreads.length === 0 && !isSearching && (
                  <div className="alert alert-secondary">
                    {searchQuery ? `ไม่พบกระทู้ที่ค้นหา "${searchQuery}"` : "ยังไม่มีกระทู้"}
                  </div>
                )}

                <div className="d-grid gap-3">
                  {filteredThreads.map(t => (
                    <div key={t.id} className="card shadow-sm">
                      <div className="card-body">
                        <div className="d-flex gap-3">
                          <img
                            src={(t.author?.avatarUrl && `${API}${t.author.avatarUrl}`) || `${API}/static/avatars/default.png`}
                            alt="avatar"
                            width="40"
                            height="40"
                            className="rounded-circle border"
                            onError={(e) => { e.currentTarget.src = `${API}/static/avatars/default.png`; }}
                          />
                          <div className="w-100">
                            <div className="d-flex justify-content-between align-items-start">
                              <h5 className="mb-1">{highlightSearchTerm(t.title, searchQuery)}</h5>
                              <small className="text-muted">{new Date(t.createdAt).toLocaleString()}</small>
                            </div>
                            <div className="text-muted small mb-2">
                              โดย {highlightSearchTerm(t.author?.username || t.author?.email || "Unknown", searchQuery)}
                            </div>
                            {t.coverUrl && (
                              <img
                                src={`${API}${t.coverUrl}`}
                                className="img-fluid rounded mb-2"
                                alt="cover"
                                onError={(e) => { e.target.style.display = "none"; }}
                              />
                            )}
                            <p className="mb-0">{highlightSearchTerm(t.body, searchQuery)}</p>

                            <div className="mt-2 d-flex gap-2 thread-action-btns">
                              {(user?.id === t.author?.id || user?.role === "admin") && (
                                <>
                                  <Link to={`/threads/${t.id}/edit`} className="btn btn-sm btn-outline-primary">แก้ไขกระทู้</Link>
                                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(t.id)}>ลบกระทู้</button>
                                </>
                              )}
                              {user && user?.id !== t.author?.id && user?.role !== "admin" && (
                                <button
                                  className="btn btn-sm btn-outline-warning"
                                  onClick={async () => {
                                    const reason = prompt("โปรดระบุเหตุผลที่รายงานกระทู้นี้");
                                    if (!reason?.trim()) return;
                                    
                                    try {
                                      const res = await fetch(`${API}/api/reports`, {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                          "Authorization": `Bearer ${user.token}`
                                        },
                                        body: JSON.stringify({ threadId: t.id, threadTitle: t.title, reason })
                                      });
                                      
                                      if (res.ok) {
                                        alert("รายงานสำเร็จ");
                                      } else {
                                        const errorData = await res.json().catch(() => ({ message: "รายงานไม่สำเร็จ" }));
                                        throw new Error(errorData.message || "รายงานไม่สำเร็จ");
                                      }
                                    } catch (error) {
                                      console.error('Error reporting thread:', error);
                                      alert(error.message || "เกิดข้อผิดพลาดในการรายงาน");
                                    }
                                  }}
                                >
                                  <i className="bi bi-flag"></i> รายงาน
                                </button>
                              )}
                            </div>

                            {/* แสดงคอมเมนต์ */}
                            {(t.comments && t.comments.length > 0) && (
                              <div className="mt-3">
                                <h6 className="small text-muted mb-2">ความคิดเห็น ({t.comments.length})</h6>
                                <div
                                  ref={el => commentRefs.current[t.id] = el}
                                  style={{ maxHeight: "300px", overflowY: "auto", paddingRight: "4px" }}
                                >
                                  {t.comments.map((c, idx) => (
                                    <div key={c.id ?? `${t.id}-${idx}`} className="border rounded p-3 mb-2">
                                      <div className="d-flex gap-2 mb-2">
                                        <img
                                          src={(c.author?.avatarUrl && `${API}${c.author.avatarUrl}`) || `${API}/static/avatars/default.png`}
                                          alt="avatar"
                                          width="24"
                                          height="24"
                                          className="rounded-circle"
                                          onError={(e) => { e.currentTarget.src = `${API}/static/avatars/default.png`; }}
                                        />
                                        <div className="flex-grow-1">
                                          <div className="d-flex justify-content-between align-items-start mb-1">
                                            <div className="small text-muted">
                                              <strong>{c.author?.username || c.author?.email || `User ${c.authorId}`}</strong>
                                              {' • '}
                                              {new Date(c.createdAt).toLocaleString("th-TH")}
                                            </div>
                                            {/* ✅ ปุ่มจัดการคอมเมนต์ */}
                                            {(user?.id === c.authorId || user?.role === "admin") && (
                                              <div className="d-flex gap-1">
                                                {user?.id === c.authorId && (
                                                  <button
                                                    className="btn btn-sm btn-outline-secondary"
                                                    onClick={() => startEditComment(c.id, c.body)}
                                                    title="แก้ไข"
                                                  >
                                                    ✏️
                                                  </button>
                                                )}
                                                <button
                                                  className="btn btn-sm btn-outline-danger"
                                                  onClick={() => handleDeleteComment(c.id, t.id)}
                                                  title="ลบ"
                                                >
                                                  🗑️
                                                </button>
                                              </div>
                                            )}
                                          </div>

                                          {/* ✅ แสดงเนื้อหาคอมเมนต์หรือฟอร์มแก้ไข */}
                                          {editingComment[c.id] !== undefined ? (
                                            // โหมดแก้ไข
                                            <div className="mb-2">
                                              {/* แสดง preview รูปที่เลือกสำหรับการแก้ไข */}
                                              {editingCommentImages[c.id] && (
                                                <div className="mb-2">
                                                  <div className="d-flex align-items-center gap-2">
                                                    <img
                                                      src={editingCommentImages[c.id].preview}
                                                      alt="preview"
                                                      className="comment-image-preview"
                                                    />
                                                    <button
                                                      type="button"
                                                      className="btn btn-sm btn-outline-danger"
                                                      onClick={() => removeEditImage(c.id)}
                                                    >
                                                      ❌ ลบรูป
                                                    </button>
                                                  </div>
                                                </div>
                                              )}
                                              
                                              <div className="d-flex flex-column gap-2">
                                                <div className="d-flex gap-2">
                                                  <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    value={editingComment[c.id]}
                                                    onChange={e => setEditingComment(prev => ({
                                                      ...prev,
                                                      [c.id]: e.target.value
                                                    }))}
                                                    placeholder="แก้ไขคอมเมนต์..."
                                                  />
                                                  <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-secondary"
                                                    onClick={() => editFileInputRefs.current[c.id]?.click()}
                                                    title="แนบรูปภาพ"
                                                  >
                                                    📷
                                                  </button>
                                                </div>
                                                <div className="d-flex gap-2">
                                                  <button
                                                    className="btn btn-sm btn-success"
                                                    onClick={() => handleUpdateComment(c.id, t.id)}
                                                  >
                                                    บันทึก
                                                  </button>
                                                  <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => cancelEditComment(c.id)}
                                                  >
                                                    ยกเลิก
                                                  </button>
                                                </div>
                                              </div>
                                              
                                              {/* Hidden file input สำหรับการแก้ไข */}
                                              <input
                                                type="file"
                                                ref={el => editFileInputRefs.current[c.id] = el}
                                                style={{ display: 'none' }}
                                                accept="image/*"
                                                onChange={(e) => {
                                                  const file = e.target.files[0];
                                                  if (file) handleEditImageSelect(c.id, file);
                                                }}
                                              />
                                            </div>
                                          ) : (
                                            // โหมดแสดงปกติ
                                            <>
                                              {c.body && <div className="mb-2">{c.body}</div>}
                                              {c.imageUrl && (
                                                <img
                                                  src={`${API}${c.imageUrl}`}
                                                  alt="comment image"
                                                  className="comment-image mb-1"
                                                  onClick={(e) => {
                                                    // เปิดรูปในหน้าต่างใหม่
                                                    window.open(e.target.src, '_blank');
                                                  }}
                                                  onError={(e) => { e.target.style.display = "none"; }}
                                                />
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* ✅ ฟอร์มคอมเมนต์พร้อมอัพโหลดรูป */}
                            <div className="mt-3">
                              {/* แสดง preview รูปที่เลือก */}
                              {commentImages[t.id] && (
                                <div className="mb-2">
                                  <div className="d-flex align-items-center gap-2">
                                    <img
                                      src={commentImages[t.id].preview}
                                      alt="preview"
                                      className="comment-image-preview"
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => removeImage(t.id)}
                                    >
                                      ❌ ลบรูป
                                    </button>
                                  </div>
                                </div>
                              )}

                              <form 
                                className="d-flex flex-column gap-2" 
                                onSubmit={e => { 
                                  e.preventDefault(); 
                                  handleComment(t.id); 
                                }}
                              >
                                <div className="d-flex gap-2">
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="แสดงความคิดเห็น..."
                                    value={comment[t.id] || ""}
                                    onChange={e => setComment({ ...comment, [t.id]: e.target.value })}
                                  />
                                  <button 
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => fileInputRefs.current[t.id]?.click()}
                                    title="แนบรูปภาพ"
                                  >
                                    📷
                                  </button>
                                  <button className="btn btn-primary" type="submit">
                                    ส่ง
                                  </button>
                                </div>

                                {/* Hidden file input */}
                                <input
                                  type="file"
                                  ref={el => fileInputRefs.current[t.id] = el}
                                  style={{ display: 'none' }}
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) handleImageSelect(t.id, file);
                                  }}
                                />
                              </form>
                            </div>

                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ✅ Sidebar */}
              <div className="col-md-4">
                <div className="card mb-3">
                  <div className="card-body text-center">
                    <h6 className="fw-bold">📅 วันเวลา</h6>
                    <div>{dateTime.toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
                    <div>{dateTime.toLocaleTimeString("th-TH")}</div>
                  </div>
                </div>

                {/* ✅ ปฏิทิน */}
                <div className="card mb-3">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <button className="btn btn-sm btn-outline-secondary" onClick={previousMonth}>
                        <i className="bi bi-chevron-left"></i>
                      </button>
                      <h6 className="fw-bold mb-0">
                        📅 {currentCalendarDate.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}
                      </h6>
                      <button className="btn btn-sm btn-outline-secondary" onClick={nextMonth}>
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </div>
                    
                    {/* ตารางปฏิทิน */}
                    <table className="table table-borderless calendar-table mb-0">
                      <thead>
                        <tr>
                          {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map(day => (
                            <th key={day} className="text-center p-1 text-muted fw-bold" style={{ fontSize: "12px" }}>
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 6 }, (_, weekIndex) => (
                          <tr key={weekIndex}>
                            {Array.from({ length: 7 }, (_, dayIndex) => {
                              const dayObj = calendarDays[weekIndex * 7 + dayIndex];
                              return (
                                <td key={dayIndex} className="p-0 text-center">
                                  <div
                                    className={`calendar-day py-2 px-1 rounded ${
                                      dayObj.isToday 
                                        ? "bg-primary text-white fw-bold calendar-today" 
                                        : dayObj.isCurrentMonth 
                                          ? "text-dark" 
                                          : "text-muted"
                                    }`}
                                    style={{
                                      cursor: "pointer",
                                      minHeight: "32px",
                                      fontSize: "13px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center"
                                    }}
                                  >
                                    {dayObj.date.getDate()}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card mb-3">
                  <div className="card-body">
                    <h6 className="fw-bold">🔥 กระทู้ยอดฮิต</h6>
                    <ul className="list-unstyled mb-0">
                      {hotThreads.map(ht => (
                        <li key={ht.id}>
                          <Link to={`/?thread=${ht.id}`} className="d-block py-1 text-decoration-none">{ht.title}</Link>
                        </li>
                      ))}
                      {hotThreads.length === 0 && <li className="text-muted">ยังไม่มีกระทู้</li>}
                    </ul>
                  </div>
                </div>

                <div className="card">
                  <div className="card-body">
                    <h6 className="fw-bold">🏷️ หมวดหมู่ยอดฮิต</h6>
                    <ul className="list-unstyled mb-0">
                      {hotCategories.map(cat => (
                        <li key={cat.id}>
                          <Link to={`/?category=${cat.name}`} className="d-block py-1 text-decoration-none">{cat.name}</Link>
                        </li>
                      ))}
                      {hotCategories.length === 0 && <li className="text-muted">ยังไม่มีหมวดหมู่</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
