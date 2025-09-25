import { Routes, Route, Navigate } from "react-router-dom";
import Thread from "./pages/Thread.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import New_Thread from "./pages/New_Thread.jsx";
import { useAuth } from "./auth.jsx";

function PrivateRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="p-4 text-center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PrivateRoute><Thread /></PrivateRoute>} />
      <Route path="/thread" element={<PrivateRoute><Thread /></PrivateRoute>} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/new_thread" element={<PrivateRoute><New_Thread /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
