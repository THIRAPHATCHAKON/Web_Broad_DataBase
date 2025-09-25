import { useEffect, useState } from "react";
import { useAuth } from "../auth.jsx";
import Header from "./Header";
import Footer from "./Footer";
const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/admin/dashboard`, {
      headers: { "Authorization": `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  if (!stats) return <div className="container py-4">Loading...</div>;

  return (
    <>
    <Header />
        <div className="container py-4">
      <h3>สถิติภาพรวม</h3>
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="card-title">จำนวนบัญชีทั้งหมด</h5>
              <p className="display-6">{stats.userCount}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="card-title">จำนวนกระทู้ทั้งหมด</h5>
              <p className="display-6">{stats.threadCount}</p>
            </div>
          </div>
        </div>
      </div>
      <h5 className="mt-4">จำนวนผู้ใช้ใหม่ในแต่ละวัน (7 วันล่าสุด)</h5>
      <table className="table table-bordered w-auto">
        <thead>
          <tr>
            <th>วันที่</th>
            <th>จำนวนผู้ใช้ใหม่</th>
          </tr>
        </thead>
        <tbody>
          {stats.dailyUsers.map(d => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* ถ้าต้องการกราฟ (ใช้ chart.js หรืออื่นๆ) */}
      {/* <canvas id="userChart"></canvas> */}
    </div>
    <Footer />
    </>
  );
}