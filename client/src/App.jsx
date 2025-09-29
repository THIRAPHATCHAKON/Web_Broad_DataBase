import { Routes, Route, Navigate } from "react-router-dom";
import Thread from "./pages/Thread.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import New_Thread from "./pages/New_Thread.jsx";
import { useAuth } from "./auth.jsx";
import EditProfile from "./pages/EditProfile.jsx";
import EditThread from "./pages/EditThread.jsx";
import ManageCategories from "./pages/ManageCategories.jsx";
import ReportList from "./pages/ReportList.jsx";
import ManageRoles from "./pages/ManageRoles.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";

function PrivateRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="p-4 text-center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* เปิดให้ทุกคนดู Thread ได้ */}
      <Route path="/" element={<Thread />} />
      <Route path="/thread" element={<Thread />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/new_thread" element={<PrivateRoute><New_Thread /></PrivateRoute>} />
      <Route path="/edit_profile" element={<PrivateRoute><EditProfile /></PrivateRoute>} />
      <Route path="/threads/:id/edit" element={<PrivateRoute><EditThread /></PrivateRoute>} />
      <Route path="/manage_categories" element={<PrivateRoute><ManageCategories /></PrivateRoute>} />
      <Route path="/report_list" element={<PrivateRoute><ReportList /></PrivateRoute>} />
      <Route path="/manage_roles" element={<PrivateRoute><ManageRoles /></PrivateRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
