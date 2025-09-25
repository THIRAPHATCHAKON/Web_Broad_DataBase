import Header from "./Header";
import Footer from "./Footer";
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Thread() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/threads`);
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.message || "โหลดกระทู้ไม่สำเร็จ");
        setThreads(data.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
                      onError={(e)=>{e.currentTarget.src=`${API}/static/avatars/default.png`;}}
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
                          onError={(e)=>{e.currentTarget.style.display="none";}}
                        />
                      )}
                      <p className="mb-0">{t.body}</p>
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
