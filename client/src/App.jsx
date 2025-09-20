import { Routes, Route, Link, Navigate } from 'react-router-dom'
import Login from "./pages/Login";
import Register from "./pages/Register";
import Thread from "./pages/Thread";

export default function App() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <main className="flex-grow-1">
        <Routes>
          <Route path="/" element={<Thread />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

