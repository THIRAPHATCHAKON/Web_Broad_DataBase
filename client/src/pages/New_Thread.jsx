import Footer from "./Footer";
import Header from "./Header";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

// เพิ่มการประกาศ API URL
const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function New_Thread() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [body, setBody]   = useState("");
  const [tags, setTags]   = useState("");
  const [file, setFile]   = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const titleLeft = 120 - title.length;
  const bodyLeft  = 5000 - body.length;
  const valid = title.trim() && body.trim() && title.length <= 120 && body.length <= 5000;

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("body", body.trim());
      formData.append("tags", tags.trim());
      formData.append("userId", user.id);
      if (file) {
        formData.append("cover", file);
      }

      const res = await fetch(`${API}/api/threads`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user.token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "สร้างกระทู้ไม่สำเร็จ");

      nav("/");
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <main className="flex-grow-1">
        <section className="container my-4" id="thread-create">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="mb-0">ตั้งกระทู้ใหม่</h5>
              </div>

              <form onSubmit={onSubmit}>
                {/* Title */}
                <div className="mb-3">
                  <label htmlFor="title" className="form-label">
                    หัวข้อกระทู้ <span className="text-danger">*</span>
                  </label>
                  <input
                    id="title"
                    type="text"
                    className="form-control"
                    placeholder="พิมพ์หัวข้อกระทู้..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    required
                  />
                  <div className="form-text">เหลือ {titleLeft} อักขระ (สูงสุด 120)</div>
                </div>

                {/* Body */}
                <div className="mb-3">
                  <label htmlFor="body" className="form-label">
                    รายละเอียด <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="body"
                    className="form-control"
                    rows={8}
                    placeholder="รายละเอียดของกระทู้ เช่น คำถาม ข้อมูลเพิ่มเติม โค้ด ฯลฯ"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={5000}
                    required
                  />
                  <div className="form-text">เหลือ {bodyLeft} อักขระ (สูงสุด 5000)</div>
                </div>

                {/* Tags */}
                <div className="mb-3">
                  <label htmlFor="tags" className="form-label">แท็ก (ไม่บังคับ)</label>
                  <input
                    id="tags"
                    type="text"
                    className="form-control"
                    placeholder="เช่น react, bootstrap, node"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                  <div className="form-text">
                    คั่นด้วยเครื่องหมายจุลภาค , เช่น <code>arduino, sensor</code>
                  </div>
                </div>

                {/* Image */}
                <div className="mb-3">
                  <label htmlFor="image" className="form-label">รูปภาพปก/ประกอบ (ไม่บังคับ)</label>
                  <input
                    id="image"
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <div className="form-text">รองรับ JPG/PNG/WebP — แนะนำ &lt; 3MB</div>
                </div>

                {/* Actions */}
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={!valid || submitting}>
                    {submitting ? "กำลังโพสต์..." : "โพสต์กระทู้"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => { setTitle(""); setBody(""); setTags(""); setFile(null); }}
                    disabled={submitting}
                  >
                    ล้างฟอร์ม
                  </button>
                </div>
              </form>

            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
