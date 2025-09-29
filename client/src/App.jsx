import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth.jsx";

// Pages
import Thread from "./pages/Thread.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import New_Thread from "./pages/New_Thread.jsx";
import EditProfile from "./pages/EditProfile.jsx";
import EditThread from "./pages/EditThread.jsx";
import ManageCategories from "./pages/ManageCategories.jsx";
import ReportList from "./pages/ReportList.jsx";
import ManageRoles from "./pages/ManageRoles.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";

// Components
import Header from "./pages/Header.jsx";
import Footer from "./pages/Footer.jsx";

// PrivateRoute
function PrivateRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="p-4 text-center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Layout สำหรับ Header + Footer
function Layout({ children }) {
  return (
    <>
      <Header />
      <main className="pt-20">{children}</main> {/* เว้น top ของ fixed header */}
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      {/* ทุก route ใช้ Layout */}
      <Route
        path="/"
        element={<Layout><Thread /></Layout>}
      />
      <Route
        path="/thread"
        element={<Layout><Thread /></Layout>}
      />

      <Route
        path="/login"
        element={<Layout><Login /></Layout>}
      />
      <Route
        path="/register"
        element={<Layout><Register /></Layout>}
      />
      <Route
        path="/forgot-password"
        element={<Layout><ForgotPassword /></Layout>}
      />

      <Route
        path="/new_thread"
        element={
          <PrivateRoute>
            <Layout><New_Thread /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/edit_profile"
        element={
          <PrivateRoute>
            <Layout><EditProfile /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/threads/:id/edit"
        element={
          <PrivateRoute>
            <Layout><EditThread /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/manage_categories"
        element={
          <PrivateRoute>
            <Layout><ManageCategories /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/report_list"
        element={
          <PrivateRoute>
            <Layout><ReportList /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/manage_roles"
        element={
          <PrivateRoute>
            <Layout><ManageRoles /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Layout><Dashboard /></Layout>
          </PrivateRoute>
        }
      />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
