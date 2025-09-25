import { useEffect, useState } from "react";
import { useAuth } from "../auth.jsx";
import Header from "./Header";
import Footer from "./Footer";
const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function ReportList() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/reports`, {
      headers: { "Authorization": `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => setReports(data.reports || []));
  }, []);

  return (
    <>
      <Header />
      <div className="container py-4">
        <h3>รายการรายงานกระทู้</h3>
        <ul className="list-group">
          {reports.map(r => (
            <li className="list-group-item" key={r._id}>
              <b>กระทู้:</b> {r.threadTitle} (ID: {r.threadId})<br />
              <b>โดย:</b> {r.reporterEmail} <br />
              <b>เหตุผล:</b> {r.reason} <br />
              <span className="text-muted small">{new Date(r.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
      <Footer />
    </>
  );
}