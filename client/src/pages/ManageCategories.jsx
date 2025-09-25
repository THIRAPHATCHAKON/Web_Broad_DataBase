import Header from "./Header";
import Footer from "./Footer";
import { useEffect, useState } from "react";
import { useAuth } from "../auth.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function ManageCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetch(`${API}/api/categories`)
      .then(res => res.json())
      .then(setCategories);
  }, []);

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch(`${API}/api/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token}`
      },
      body: JSON.stringify({ name: newName })
    });
    const data = await res.json();
    if (res.ok) {
      setCategories([...categories, data.category]);
      setNewName("");
    } else {
      alert(data.message || "เพิ่มหมวดหมู่ไม่สำเร็จ");
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("ยืนยันลบหมวดหมู่นี้?")) return;
    const res = await fetch(`${API}/api/categories/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${user.token}` }
    });
    if (res.ok) {
      setCategories(categories.filter(c => c.id !== id));
    } else {
      alert("ลบหมวดหมู่ไม่สำเร็จ");
    }
  };

  return (
    <>
      <Header />
      <div className="container py-4">
        <h3>จัดการหมวดหมู่</h3>
        <form className="mb-3 d-flex gap-2" onSubmit={addCategory}>
          <input
            className="form-control"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="ชื่อหมวดหมู่ใหม่"
          />
          <button className="btn btn-success" type="submit">เพิ่ม</button>
        </form>
        <ul className="list-group">
          {categories.map(cat => (
            <li className="list-group-item d-flex justify-content-between align-items-center" key={cat.id}>
              <span>{cat.name}</span>
              <button className="btn btn-sm btn-danger" onClick={() => deleteCategory(cat.id)}>ลบ</button>
            </li>
          ))}
        </ul>
      </div>
      <Footer />
    </>
  );
}