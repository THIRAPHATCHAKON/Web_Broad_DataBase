import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Header() {
  const nav = useNavigate();
  const { user, ready, signOut } = useAuth();
  if (!ready) return null;

  if (!user) {
    return (
      <header className="p-3 text-bg-dark">
        <div className="container d-flex justify-content-between align-items-center">
          <Link to="/" className="navbar-brand text-white">Mini Forum</Link>
          <div className="d-flex gap-2">
            <Link to="/login" className="btn btn-outline-light btn-sm">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="p-3 text-bg-dark">
      <div className="container d-flex justify-content-between align-items-center">
        <Link to="/" className="navbar-brand text-white">Mini Forum</Link>
        <div className="dropdown text-end">
          <a href="#" className="d-inline-flex align-items-center text-white text-decoration-none dropdown-toggle" data-bs-toggle="dropdown">
            <img
              src={`http://localhost:3000${user.avatarUrl}`}
              onError={(e) => { e.currentTarget.src = "http://localhost:3000/static/avatars/default.png"; }}
              alt="avatar"
              width="32"
              height="32"
              className="rounded-circle me-2"
            />
            <span className="small">{user.email}</span>
          </a>
          <ul className="dropdown-menu dropdown-menu-end">
            <li><Link className="dropdown-item" to="/edit_profile">EditProfile</Link></li>
            <li><hr className="dropdown-divider" /></li>
            <li><Link className="dropdown-item" to="/new_thread">New thread</Link></li>
            <li><hr className="dropdown-divider" /></li>
            <li><button className="dropdown-item" onClick={() => { signOut(); nav("/login",{replace:true}); }}>Sign out</button></li>
          </ul>
        </div>
      </div>
    </header>
  );
}
