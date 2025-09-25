import { useState, useEffect } from "react";
import { useAuth } from "../auth";

// เพิ่มการประกาศ API URL
const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function EditProfile() {
  const { user, signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setEmail(user.email || "");
      // ตั้งค่า preview จาก user.avatarUrl
      setPreview(user.avatarUrl ? `${API}${user.avatarUrl}` : `${API}/static/avatars/default.png`);
    }
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      // สร้าง URL สำหรับ preview
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", username);
      if (avatar) {
        formData.append("avatar", avatar);
      }

      const res = await fetch(`${API}/api/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${user.token}`
        },
        body: formData  // ส่ง FormData แทน JSON
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "แก้ไขไม่สำเร็จ");

      // อัพเดต user ใน context
      signIn({ ...user, ...data.user });
      alert("บันทึกการเปลี่ยนแปลงแล้ว");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="container my-4">
        <div className="card shadow-sm">
          <div className="card-body">
            <h3 className="mb-3">แก้ไขโปรไฟล์</h3>
            <form onSubmit={handleSubmit}>
              <div className="text-center mb-3">
                <img
                  src={preview}
                  alt="Avatar"
                  className="rounded-circle mb-2"
                  style={{ width: "150px", height: "150px", objectFit: "cover" }}
                  onError={(e) => {
                    e.target.src = `${API}/static/avatars/default.png`;
                  }}
                />
                <div>
                  <label className="btn btn-outline-secondary btn-sm">
                    เปลี่ยนรูปโปรไฟล์
                    <input
                      type="file"
                      className="d-none"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">ชื่อผู้ใช้</label>
                <input
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">อีเมล</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  disabled
                />
              </div>

              <button className="btn btn-primary" disabled={loading}>
                {loading ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}