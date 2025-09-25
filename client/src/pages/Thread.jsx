import Header from "./Header";
import Footer from "./Footer";
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Thread() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState({});
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/threads`);
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.message || "โหลดกระทู้ไม่สำเร็จ");
        const items = data.items || data.threads || data || [];

        // โหลด comments ของแต่ละ thread แบบ robust
        await Promise.all(items.map(async (t) => {
          try {
            const rc = await fetch(`${API}/api/threads/${t.id}/comments`, {
              headers: { "Authorization": `Bearer ${user?.token}` } // ถ้าต้องการ auth
            });
            if (!rc.ok) {
              // ถ้า endpoint /comments ไม่มี ให้พยายามดูว่ server คืน comments มาใน thread object
              t.comments = t.comments || [];
              return;
            }
            const dc = await rc.json().catch(() => null);
            // รองรับหลายรูปแบบ response
            t.comments = (dc && (dc.items || dc.comments || dc)) || [];
            // ensure array
            if (!Array.isArray(t.comments)) t.comments = [];
            // optional: sort by createdAt
            t.comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          } catch (err) {
            t.comments = t.comments || [];
          }
        }));

        setThreads(items);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);


  const handleDelete = async (id) => {
    if (!window.confirm("ยืนยันการลบกระทู้?")) return;
    try {
      const res = await fetch(`${API}/api/threads/${id}?userId=${user.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${user.token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "ลบไม่สำเร็จ" }));
        throw new Error(err.message || "ลบไม่สำเร็จ");
      }
      setThreads(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  const handleComment = async (threadId) => {
    if (!comment[threadId]) return;
    try {
      const res = await fetch(`${API}/api/threads/${threadId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user?.token}`
        },
        body: JSON.stringify({ body: comment[threadId], authorId: user?.id })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        // ถ้ามีข้อความ error จาก server ลองแสดง
        throw new Error((data && data.message) || "คอมเมนต์ไม่สำเร็จ");
      }

      // พยายามรีโหลด comments ของกระทู้นี้จาก server เพื่อให้แน่ใจว่าเป็นข้อมูลล่าสุดจาก DB
      try {
        const rc = await fetch(`${API}/api/threads/${threadId}/comments`, {
          headers: { "Authorization": `Bearer ${user?.token}` }
        });
        if (rc.ok) {
          const dc = await rc.json().catch(() => null);
          const list = (dc && (dc.items || dc.comments || dc)) || [];
          setThreads(prev => prev.map(t => t.id === threadId ? { ...t, comments: list } : t));
        } else {
          // fallback: ถ้า server ไม่คืน list ให้ใช้ comment ที่ server คืนมา (data.comment)
          const newComment = data.comment;
          if (newComment) {
            if (!newComment.author) newComment.author = { id: user?.id, username: user?.username, email: user?.email, avatarUrl: user?.avatarUrl };
            setThreads(prev => prev.map(t => t.id === threadId
              ? { ...t, comments: [...(t.comments || []), newComment] }
              : t
            ));
          }
        }
      } catch (err) {
        // network / parse error -> fallback append
        const newComment = data?.comment;
        if (newComment) {
          if (!newComment.author) newComment.author = { id: user?.id, username: user?.username, email: user?.email, avatarUrl: user?.avatarUrl };
          setThreads(prev => prev.map(t => t.id === threadId
            ? { ...t, comments: [...(t.comments || []), newComment] }
            : t
          ));
        }
      }

      setComment(prev => ({ ...prev, [threadId]: "" }));
    } catch (e) {
      alert(e.message);
    }
  };

  const handleEdit = async (threadId, title, body, tags) => {
    try {
      const res = await fetch(`${API}/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, tags, userId: user.id })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "แก้ไขไม่สำเร็จ");
      // อัปเดต state ตาม response ถ้าต้องการ
      if (data.thread) {
        setThreads(prev => prev.map(t => t.id === threadId ? { ...t, ...data.thread } : t));
      }
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div className="p-4 text-center">Loading…</div>;

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <main className="flex-grow-1">
        <section className="container my-4">
          <h5 className="mb-3">Threads</h5>

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
                      alt="avatar" width="40" height="40"
                      className="rounded-circle border"
                      onError={(e) => { e.currentTarget.src = `${API}/static/avatars/default.png`; }}
                    />
                    <div className="w-100">
                      <div className="d-flex justify-content-between align-items-start">
                        <h5 className="mb-1">{t.title}</h5>
                        <small className="text-muted">
                          {new Date(t.createdAt).toLocaleString()}
                        </small>
                      </div>
                      <div className="text-muted small mb-2">
                        by {t.author?.username || t.author?.email || "Unknown"}
                      </div>
                      {t.coverUrl && (
                        <img
                          src={`${API}${t.coverUrl}`}
                          className="img-fluid rounded mb-2"
                          alt="cover"
                          onError={(e) => {
                            console.error(`Failed to load image: ${e.target.src}`);
                            e.target.style.display = "none";
                          }}
                        />
                      )}
                      <p className="mb-0">{t.body}</p>

                      {/* ปุ่มลบเฉพาะเจ้าของ */}
                      {user?.id === t.author?.id && (
                        <button
                          className="btn btn-danger btn-sm mt-2"
                          onClick={() => handleDelete(t.id)}
                        >
                          ลบกระทู้
                        </button>
                      )}

                      {/* แสดงคอมเมนต์ ถ้ามี */}
                      {(t.comments && t.comments.length > 0) && (
                        <div className="mt-3">
                          <h6 className="small text-muted mb-2">Comments</h6>
                          {t.comments.map(c => (
                            <div key={c.id ?? `${t.id}-${Math.random()}`} className="border rounded p-2 mb-2">
                              <div className="small text-muted mb-1">
                                by {c.author?.username || c.author?.email || (`User ${c.authorId ?? "?"}`)} • {new Date(c.createdAt).toLocaleString()}
                              </div>
                              <div>{c.body}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ฟอร์มคอมเมนต์: ให้ทุกคนคอมเมนต์ได้ (รวมเจ้าของ) */}
                      <form
                        className="mt-3"
                        onSubmit={e => {
                          e.preventDefault();
                          handleComment(t.id);
                        }}
                      >
                        <div className="input-group">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="แสดงความคิดเห็น..."
                            value={comment[t.id] || ""}
                            onChange={e => setComment({ ...comment, [t.id]: e.target.value })}
                          />
                          <button className="btn btn-primary" type="submit">ส่ง</button>
                        </div>
                      </form>

                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </section>
      </main>
      <Footer />
    </div>
  );
}