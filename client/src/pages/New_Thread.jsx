/*
 * ==================================================================================
 * ✏️ NEW THREAD PAGE - หน้าสร้างกระทู้ใหม่
 * ==================================================================================
 * 
 * 🎯 วัตถุประสงค์: ให้ผู้ใช้สร้างกระทู้ใหม่ พร้อมอัปโลดรูปภาพและเลือกหมวดหมู่
 * 🔐 ความปลอดภัย: ต้องเข้าสู่ระบบก่อนถึงจะสร้างกระทู้ได้
 * 🎨 ฟีเจอร์: หัวข้อ, เนื้อหา, แท็ก, รูปภาพ, หมวดหมู่, สร้างหมวดหมู่ใหม่
 * 
 * ==================================================================================
 */

import Footer from "./Footer";
import Header from "./Header";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

// 🌐 กำหนด API URL จาก environment variable
const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function New_Thread() {
  // 🛠️ Hooks สำหรับ authentication และการนำทาง
  const { user } = useAuth();                    // ข้อมูลผู้ใช้ปัจจุบัน
  const nav = useNavigate();                     // สำหรับการนำทางหลังสร้างกระทู้เสร็จ

  // 📝 Form states - ข้อมูลกระทู้ใหม่
  const [title, setTitle] = useState("");        // หัวข้อกระทู้
  const [body, setBody]   = useState("");        // เนื้อหากระทู้
  const [tags, setTags]   = useState("");
  const [file, setFile]   = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const titleLeft = 120 - title.length;
  const bodyLeft  = 5000 - body.length;
  const valid = title.trim() && body.trim() && title.length <= 120 && body.length <= 5000;

useEffect(() => {
  loadCategories();
}, []);

const loadCategories = () => {
  fetch(`${API}/api/categories`)
    .then(res => res.json())
    .then(setCategories)
    .catch(() => setCategories([]));
};

const handleCreateCategory = async (e) => {
  e.preventDefault();
  if (!newCategoryName.trim() || creatingCategory) return;
  
  setCreatingCategory(true);
  try {
    const res = await fetch(`${API}/api/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token}`
      },
      body: JSON.stringify({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || null
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "สร้างหมวดหมู่ไม่สำเร็จ");

    // รีโหลดหมวดหมู่และเลือกหมวดหมู่ใหม่
    await loadCategories();
    setCategoryId(data.id || data.category?.id);
    
    // ปิด modal และล้างฟอร์ม
    setShowNewCategoryModal(false);
    setNewCategoryName("");
    setNewCategoryDescription("");
    
    alert("สร้างหมวดหมู่สำเร็จ!");
  } catch (err) {
    alert(err.message);
  } finally {
    setCreatingCategory(false);
  }
};

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
      formData.append("categoryId", categoryId);
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
                <h5 className="mb-0">
                  <i className="bi bi-plus-circle-fill text-primary me-2"></i>
                  ตั้งกระทู้ใหม่
                </h5>
              </div>

              <form onSubmit={onSubmit}>
                {/* Title */}
                <div className="mb-3">
                  <label htmlFor="title" className="form-label">
                    <i className="bi bi-pencil-square text-primary me-1"></i>
                    หัวข้อกระทู้ <span className="text-danger fw-bold">*</span>
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
                  <div className="form-text d-flex align-items-center">
                    <i className="bi bi-info-circle me-1"></i>
                    เหลือ {titleLeft} อักขระ (สูงสุด 120)
                    {titleLeft < 20 && titleLeft >= 0 && (
                      <span className="badge bg-warning text-dark ms-2">
                        <i className="bi bi-exclamation-triangle-fill me-1"></i>
                        เหลือน้อย
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="mb-3">
                  <label htmlFor="body" className="form-label">
                    <i className="bi bi-card-text text-info me-1"></i>
                    รายละเอียด <span className="text-danger fw-bold">*</span>
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
                  <div className="form-text d-flex align-items-center">
                    <i className="bi bi-info-circle me-1"></i>
                    เหลือ {bodyLeft} อักขระ (สูงสุด 5000)
                    {bodyLeft < 500 && bodyLeft >= 0 && (
                      <span className="badge bg-warning text-dark ms-2">
                        <i className="bi bi-exclamation-triangle-fill me-1"></i>
                        เหลือน้อย
                      </span>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="mb-3">
                  <label htmlFor="tags" className="form-label">
                    <i className="bi bi-tags text-warning me-1"></i>
                    แท็ก <span className="text-muted">(ไม่บังคับ)</span>
                  </label>
                  <input
                    id="tags"
                    type="text"
                    className="form-control"
                    placeholder="เช่น react, bootstrap, node"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                  <div className="form-text d-flex align-items-center">
                    <i className="bi bi-lightbulb text-warning me-1"></i>
                    คั่นด้วยเครื่องหมายจุลภาค , เช่น <code>arduino, sensor</code>
                  </div>
                </div>

                {/* Image */}
                <div className="mb-3">
                  <label htmlFor="image" className="form-label">
                    <i className="bi bi-image text-success me-1"></i>
                    รูปภาพปก/ประกอบ <span className="text-muted">(ไม่บังคับ)</span>
                  </label>
                  <input
                    id="image"
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <div className="form-text d-flex align-items-center">
                    <i className="bi bi-camera text-success me-1"></i>
                    รองรับ JPG/PNG/WebP — แนะนำ &lt; 3MB
                  </div>
                </div>

                {/* Category */}
                <div className="mb-3">
                  <label className="form-label">
                    <i className="bi bi-folder text-secondary me-1"></i>
                    หมวดหมู่ <span className="text-danger fw-bold">*</span>
                  </label>
                  <div className="d-flex gap-2">
                    <select
                      className="form-select"
                      value={categoryId}
                      onChange={e => setCategoryId(e.target.value)}
                      required
                    >
                      <option value="">-- เลือกหมวดหมู่ --</option>
                      {categories.length === 0
                        ? <option disabled>กำลังโหลด...</option>
                        : categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))
                      }
                    </select>
                    <button
                      type="button"
                      className="btn btn-outline-success d-flex align-items-center justify-content-center"
                      onClick={() => setShowNewCategoryModal(true)}
                      title="สร้างหมวดหมู่ใหม่"
                      style={{ minWidth: "140px", whiteSpace: "nowrap" }}
                    >
                      <i className="bi bi-plus-circle-fill me-1"></i>
                      สร้างหมวดหมู่
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary d-flex align-items-center" disabled={!valid || submitting}>
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        <i className="bi bi-cloud-upload me-1"></i>
                        กำลังโพสต์...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send-fill me-1"></i>
                        โพสต์กระทู้
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary d-flex align-items-center"
                    onClick={() => { setTitle(""); setBody(""); setTags(""); setFile(null); setCategoryId(""); }}
                    disabled={submitting}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    ล้างฟอร์ม
                  </button>
                </div>
              </form>

            </div>
          </div>
        </section>
      </main>

      {/* Modal สร้างหมวดหมู่ใหม่ */}
      {showNewCategoryModal && (
        <div 
          className="modal fade show d-block" 
          tabIndex="-1" 
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !creatingCategory) {
              setShowNewCategoryModal(false);
            }
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-folder-plus text-success me-2"></i>
                  สร้างหมวดหมู่ใหม่
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowNewCategoryModal(false)}
                  disabled={creatingCategory}
                ></button>
              </div>
              <form onSubmit={handleCreateCategory}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="newCategoryName" className="form-label">
                      <i className="bi bi-tag-fill text-primary me-1"></i>
                      ชื่อหมวดหมู่ <span className="text-danger fw-bold">*</span>
                    </label>
                    <input
                      id="newCategoryName"
                      type="text"
                      className="form-control"
                      placeholder="เช่น เทคโนโลยี, กีฬา, ท่องเที่ยว"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      maxLength={50}
                      required
                      disabled={creatingCategory}
                    />
                    <div className="form-text">
                      เหลือ {50 - newCategoryName.length} อักขระ
                    </div>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newCategoryDescription" className="form-label">
                      <i className="bi bi-card-text text-info me-1"></i>
                      คำอธิบาย <span className="text-muted">(ไม่บังคับ)</span>
                    </label>
                    <textarea
                      id="newCategoryDescription"
                      className="form-control"
                      rows={3}
                      placeholder="อธิบายเกี่ยวกับหมวดหมู่นี้..."
                      value={newCategoryDescription}
                      onChange={(e) => setNewCategoryDescription(e.target.value)}
                      maxLength={200}
                      disabled={creatingCategory}
                    />
                    <div className="form-text">
                      เหลือ {200 - newCategoryDescription.length} อักขระ
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary d-flex align-items-center"
                    onClick={() => setShowNewCategoryModal(false)}
                    disabled={creatingCategory}
                  >
                    <i className="bi bi-x-circle me-1"></i>
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success d-flex align-items-center"
                    disabled={!newCategoryName.trim() || creatingCategory}
                  >
                    {creatingCategory ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        <i className="bi bi-cloud-upload me-1"></i>
                        กำลังสร้าง...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle-fill me-1"></i>
                        สร้างหมวดหมู่
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
