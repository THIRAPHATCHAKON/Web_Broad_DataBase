import Header from "./Header";
import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Thread() {
  const location = useLocation();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState({});
  const commentRefs = useRef({});
  const params = new URLSearchParams(location.search);
  const category = params.get("category");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // ✅ state สำหรับ sidebar
  const [dateTime, setDateTime] = useState(new Date());
  const [hotThreads, setHotThreads] = useState([]);
  const [hotCategories, setHotCategories] = useState([]);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

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
      } catch (error) {
        console.error('Error loading threads:', error);
        setThreads([]);
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

  const handleComment = async (threadId) => {
    if (!comment[threadId]?.trim()) return;
    
    try {
      const res = await fetch(`${API}/api/threads/${threadId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user?.token}`
        },
        body: JSON.stringify({ body: comment[threadId], authorId: user?.id })
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

      // Clear comment input
      setComment(prev => ({ ...prev, [threadId]: "" }));
    } catch (error) {
      console.error('Error posting comment:', error);
      alert(error.message || "เกิดข้อผิดพลาดในการส่งคอมเมนต์");
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
      `}</style>
      <div className="d-flex flex-column min-vh-100">
        <Header />
      <main className="flex-grow-1">
        <div className="container my-4">
          <div className="row">
            {/* ✅ ส่วนกระทู้ */}
            <div className="col-md-8">
              <h5 className="mb-3">กระทู้</h5>

              {threads.length === 0 && (
                <div className="alert alert-secondary">ยังไม่มีกระทู้</div>
              )}

              <div className="d-grid gap-3">
                {threads.map(t => (
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
                            <h5 className="mb-1">{t.title}</h5>
                            <small className="text-muted">{new Date(t.createdAt).toLocaleString()}</small>
                          </div>
                          <div className="text-muted small mb-2">
                            โดย {t.author?.username || t.author?.email || "Unknown"}
                          </div>
                          {t.coverUrl && (
                            <img
                              src={`${API}${t.coverUrl}`}
                              className="img-fluid rounded mb-2"
                              alt="cover"
                              onError={(e) => { e.target.style.display = "none"; }}
                            />
                          )}
                          <p className="mb-0">{t.body}</p>

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
                              <h6 className="small text-muted mb-2">ความคิดเห็น</h6>
                              <div
                                ref={el => commentRefs.current[t.id] = el}
                                style={{ maxHeight: "200px", overflowY: "auto", paddingRight: "4px" }}
                              >
                                {t.comments.map((c, idx) => (
                                  <div key={c.id ?? `${t.id}-${idx}`} className="border rounded p-2 mb-2">
                                    <div className="small text-muted mb-1">
                                      โดย {c.author?.username || c.author?.email || (`User ${c.authorId ?? "?"}`)} • {new Date(c.createdAt).toLocaleString()}
                                    </div>
                                    <div>{c.body}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ฟอร์มคอมเมนต์ */}
                          <form className="mt-3 d-flex" onSubmit={e => { e.preventDefault(); handleComment(t.id); }}>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="แสดงความคิดเห็น..."
                              value={comment[t.id] || ""}
                              onChange={e => setComment({ ...comment, [t.id]: e.target.value })}
                            />
                            <button className="btn btn-sm btn-primary ms-2" type="submit">ส่ง</button>
                          </form>

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
