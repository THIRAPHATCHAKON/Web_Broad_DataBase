import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth";
import Header from "./Header";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function EditThread() {
  const { id } = useParams();  // รับ id จาก URL
  const nav = useNavigate();
  const { user } = useAuth();
  
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [cover, setCover] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmmiting] = useState(false);

  // โหลดข้อมูลกระทู้เดิม
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/threads/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "โหลดข้อมูลไม่สำเร็จ");

        // ตรวจสอบว่าเป็นเจ้าของกระทู้
        if (data.thread.authorId !== user?.id) {
          nav("/");
          return;
        }

        setTitle(data.thread.title || "");
        setBody(data.thread.body || "");
        setTags(data.thread.tags || "");
        if (data.thread.coverUrl) {
          setPreview(`${API}${data.thread.coverUrl}`);
        }
      } catch (err) {
        alert(err.message);
        nav("/");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user?.id, nav]);

  // Preview รูปที่เลือก
  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCover(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // ส่งฟอร์มแก้ไข
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmmiting(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("body", body.trim());
      formData.append("tags", tags.trim());
      formData.append("userId", user.id);
      if (cover) {
        formData.append("cover", cover);
      }

      const res = await fetch(`${API}/api/threads/${id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${user.token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "แก้ไขไม่สำเร็จ");

      nav("/");
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmmiting(false);
    }
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;

  return (
    <>
      <Header />
      <div className="container my-4">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title mb-4">แก้ไขกระทู้</h4>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">หัวข้อ</label>
                <input
                  type="text"
                  className="form-control"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  maxLength={120}
                />
                <small className="text-muted">เหลือ {120 - title.length} ตัวอักษร</small>
              </div>

              <div className="mb-3">
                <label className="form-label">เนื้อหา</label>
                <textarea
                  className="form-control"
                  rows={8}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  required
                  maxLength={5000}
                />
                <small className="text-muted">เหลือ {5000 - body.length} ตัวอักษร</small>
              </div>

              <div className="mb-3">
                <label className="form-label">แท็ก</label>
                <input
                  type="text"
                  className="form-control"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder="คั่นด้วยเครื่องหมาย , เช่น react, javascript"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">รูปภาพ</label>
                {preview && (
                  <div className="mb-2">
                    <img
                      src={preview}
                      alt="Preview"
                      className="img-fluid rounded"
                      style={{ maxHeight: "200px" }}
                    />
                  </div>
                )}
                <input
                  type="file"
                  className="form-control"
                  accept="image/*"
                  onChange={handleCoverChange}
                />
              </div>

              <div className="text-end">
                <button
                  type="button"
                  className="btn btn-outline-secondary me-2"
                  onClick={() => nav("/")}
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}