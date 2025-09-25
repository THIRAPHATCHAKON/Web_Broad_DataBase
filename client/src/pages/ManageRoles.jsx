import { useEffect, useState } from "react";
import { useAuth } from "../auth.jsx";
import Footer from "./Footer";
import Header from "./Header";
const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function ManageRoles() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/users`, {
      headers: { "Authorization": `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => setUsers(data.users || []));
  }, []);

  const changeRole = async (id, newRole) => {
    const res = await fetch(`${API}/api/users/${id}/role`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token}`
      },
      body: JSON.stringify({ role: newRole })
    });
    if (res.ok) {
      setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
    } else {
      alert("เปลี่ยน role ไม่สำเร็จ");
    }
  };

  return (
    <>
    <Header />
        <div className="container py-4">
      <h3>เปลี่ยน Role User</h3>
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>Email</th>
            <th>Username</th>
            <th>Role</th>
            <th>เปลี่ยน Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.username}</td>
              <td>{u.role}</td>
              <td>
                <select
                  value={u.role}
                  onChange={e => changeRole(u.id, e.target.value)}
                  className="form-select form-select-sm"
                  style={{ width: 120 }}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <Footer />
    </>
  );
}