import { useState, useMemo } from "react";

function Header() {
  return (
    <header className="border-bottom">
      <nav className="container navbar navbar-expand-lg">
        <a className="navbar-brand fw-semibold" href="/">Mini Forum</a>
        <div className="ms-auto d-flex gap-2">
          <a className="btn btn-outline-primary btn-sm" href="#">Login</a>
          <a className="btn btn-primary btn-sm" href="#">Sign up</a>
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-top mt-5">
      <div className="container py-3 text-muted small">
        © 2025 Mini Forum
      </div>
    </footer>
  );
}

export default function App() {
  // state ของ thread
  const [title, setTitle] = useState("Welcome Thread");
  const [author, setAuthor] = useState("Admin");
  const [body, setBody] = useState("ยินดีต้อนรับสู่ Mini Forum — ลองคอมเมนต์ได้เลย!");
  const [deleted, setDeleted] = useState(false);

  // เวลาแบบ “just now” ง่ายๆ
  const timeText = useMemo(() => "just now", []);

  // state ของคอมเมนต์
  const [comments, setComments] = useState([]);

  // ฟอร์มคอมเมนต์
  async function onSubmitComment(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newItem = {
      id: Date.now(),
      author: fd.get("author"),
      body: fd.get("body"),
      time: new Date().toLocaleString(),
    };
    setComments((prev) => [newItem, ...prev]);
    e.currentTarget.reset();
  }

  // ลบกระทู้ (เดโม: ทำเครื่องหมายว่า deleted)
  function onDeleteThread() {
    setDeleted(true);
  }

  // Save จาก modal
function onSaveEdit(e) {
  e.preventDefault();
  // ... อัปเดต state

  const modalEl = document.getElementById('editThreadModal');
  const bs = window.bootstrap;        // ← อ้างครั้งเดียว
  if (modalEl && bs && bs.Modal) {
    const modal = bs.Modal.getInstance(modalEl) || new bs.Modal(modalEl);
    modal.hide();
  }
}

  return (
    <>
      <Header />

      <section className="container my-4" id="demo-thread">
        <div className="card shadow-sm thread-card">
          <div className="card-body">
            <div className="d-flex align-items-start justify-content-between">
              <div className="d-flex gap-3">
                <div className="avatar rounded-circle d-flex align-items-center justify-content-center bg-secondary-subtle" style={{width:40, height:40}}>
                  AD
                </div>
                <div>
                  <h5 className="mb-1" id="threadTitle">
                    {deleted ? <span className="text-danger">This thread has been deleted.</span> : title}
                  </h5>
                  <div className="text-muted small">
                    by <span className="fw-semibold" id="threadAuthor">{author}</span> ·{" "}
                    <span id="threadTime">{timeText}</span>
                  </div>
                </div>
              </div>

              <div className="dropdown">
                <button className="btn btn-outline-secondary btn-sm dropdown-toggle" data-bs-toggle="dropdown">
                  Manage
                </button>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <button className="dropdown-item" data-bs-toggle="modal" data-bs-target="#editThreadModal" disabled={deleted}>
                      Edit thread
                    </button>
                  </li>
                  <li>
                    <button className="dropdown-item text-danger" id="deleteThreadBtn" onClick={onDeleteThread} disabled={deleted}>
                      Delete thread
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <p className="mt-3 mb-0" id="threadBody">
              {deleted ? <em className="text-muted">โพสต์นี้ถูกลบแล้ว</em> : body}
            </p>
          </div>

          <div className="card-footer bg-white">
            <h6 className="mb-3">Comments</h6>

            {/* comment list */}
            <ul className="list-group list-group-flush mb-3" id="commentList">
              {comments.length === 0 && (
                <li className="list-group-item text-muted">ยังไม่มีคอมเมนต์</li>
              )}
              {comments.map((c) => (
                <li key={c.id} className="list-group-item">
                  <div className="d-flex justify-content-between">
                    <div>
                      <strong>{c.author}</strong>
                      <div className="text-muted small">{c.time}</div>
                    </div>
                  </div>
                  <div className="mt-2">{c.body}</div>
                </li>
              ))}
            </ul>

            {/* add comment */}
            <form id="commentForm" className="row g-2 align-items-center" onSubmit={onSubmitComment}>
              <div className="col-12 col-md-3">
                <input className="form-control" name="author" placeholder="Your name" required />
              </div>
              <div className="col-12 col-md-7">
                <input className="form-control" name="body" placeholder="Write a comment..." required />
              </div>
              <div className="col-12 col-md-2 d-grid">
                <button className="btn btn-primary">Comment</button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Edit Thread Modal */}
      <div className="modal fade" id="editThreadModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <form className="modal-content" id="editThreadForm" onSubmit={onSaveEdit}>
            <div className="modal-header">
              <h5 className="modal-title">Edit thread</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label" htmlFor="editTitle">Title</label>
                <input className="form-control" id="editTitle" defaultValue={title} required />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="editBody">Body</label>
                <textarea className="form-control" rows="4" id="editBody" defaultValue={body} required />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="editAuthor">Author</label>
                <input className="form-control" id="editAuthor" defaultValue={author} required />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary">Save changes</button>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </>
  );
}
