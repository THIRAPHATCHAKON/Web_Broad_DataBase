import Header from "./Header";
import Footer from "./Footer";
import Header_user from "./Header_user";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Thread() {
    const nav = useNavigate();

    // 1) hooks ทั้งหมดอยู่ข้างบน
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // demo thread state (ต้องประกาศก่อน return/if ใดๆ)
    const [title, setTitle] = useState("Welcome Thread");
    const [author, setAuthor] = useState("Admin");
    const [body, setBody] = useState("ยินดีต้อนรับสู่ Mini Forum — ลองคอมเมนต์ได้เลย!");
    const [deleted, setDeleted] = useState(false);
    const timeText = useMemo(() => "just now", []);
    const [comments, setComments] = useState([]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem("user");
            if (!raw) throw new Error("no user");
            const u = JSON.parse(raw);
            if (!u?.email || !u?.role) throw new Error("bad user");
            setUser(u);
        } catch {
            localStorage.removeItem("user");
            nav("/login", { replace: true });
        } finally {
            setLoading(false);
        }
    }, [nav]);

    // 2) ค่อย return เงื่อนไขได้ หลังประกาศ hooks ครบแล้ว
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="text-muted">Loading…</div>
            </div>
        );
    }

    const isAuthed = !!user;

    function onDeleteThread() {
        setDeleted(true);
    }

    async function onSubmitComment(e) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setComments(prev => [{
            id: Date.now(),
            author: fd.get("author"),
            body: fd.get("body"),
            time: new Date().toLocaleString(),
        }, ...prev]);
        e.currentTarget.reset();
    }

    function onSaveEdit(e) {
        e.preventDefault();
        const titleEl = document.getElementById("editTitle");
        const bodyEl = document.getElementById("editBody");
        const authorEl = document.getElementById("editAuthor");
        setTitle(titleEl.value);
        setBody(bodyEl.value);
        setAuthor(authorEl.value);

        const modalEl = document.getElementById("editThreadModal");
        const bs = window.bootstrap;
        if (modalEl && bs?.Modal) {
            const modal = bs.Modal.getInstance(modalEl) || new bs.Modal(modalEl);
            modal.hide();
        }
    }

    return (
        <div className="d-flex flex-column min-vh-100">
            {isAuthed ? <Header_user /> : <Header />}

            <main className="flex-grow-1">
                <section className="container my-4" id="demo-thread">
                    <div className="card shadow-sm thread-card">
                        <div className="card-body">
                            <div className="d-flex align-items-start justify-content-between">
                                <div className="d-flex gap-3">
                                    <div className="avatar rounded-circle d-flex align-items-center justify-content-center bg-secondary-subtle" style={{ width: 40, height: 40 }}>
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

                            <ul className="list-group list-group-flush mb-3" id="commentList">
                                {comments.length === 0 && <li className="list-group-item text-muted">ยังไม่มีคอมเมนต์</li>}
                                {comments.map(c => (
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

                            <form className="row g-2 align-items-center" onSubmit={onSubmitComment}>
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
            </main>

            {/* Edit Thread Modal */}
            <div className="modal fade" id="editThreadModal" tabIndex="-1" aria-hidden="true">
                <div className="modal-dialog">
                    <form className="modal-content" onSubmit={onSaveEdit}>
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
        </div>
    );
}
