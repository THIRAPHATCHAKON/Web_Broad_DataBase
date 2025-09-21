import Footer from "./Footer";
import Header from "./Header";

export default function New_Thread() {
    return (
        <>
            <div className="d-flex flex-column min-vh-100">
                <Header />
                <main className="flex-grow-1">
                    <section className="container my-4" id="thread-create">
                        <div className="card shadow-sm">
                            <div className="card-body">
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <h5 className="mb-0">ตั้งกระทู้ใหม่</h5>
                                </div>

                                {/* Alerts (ตัวอย่างหน้าตาเฉยๆ) */}
                                {/* <div className="alert alert-danger py-2">บันทึกไม่สำเร็จ</div>
            <div className="alert alert-success py-2">สร้างกระทู้สำเร็จ!</div> */}

                                <form>
                                    {/* Title */}
                                    <div className="mb-3">
                                        <label htmlFor="title" className="form-label">
                                            หัวข้อกระทู้ <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            id="title"
                                            type="text"
                                            className="form-control"
                                            placeholder="พิมพ์หัวข้อกระทู้..."
                                        />
                                        <div className="form-text">เหลือ 120 อักขระ (สูงสุด 120)</div>
                                    </div>

                                    {/* Body */}
                                    <div className="mb-3">
                                        <label htmlFor="body" className="form-label">
                                            รายละเอียด <span className="text-danger">*</span>
                                        </label>
                                        <textarea
                                            id="body"
                                            className="form-control"
                                            rows={8}
                                            placeholder="รายละเอียดของกระทู้ เช่น คำถาม ข้อมูลเพิ่มเติม โค้ด ฯลฯ"
                                        />
                                        <div className="form-text">เหลือ 5000 อักขระ (สูงสุด 5000)</div>
                                    </div>

                                    {/* Tags */}
                                    <div className="mb-3">
                                        <label htmlFor="tags" className="form-label">แท็ก (ไม่บังคับ)</label>
                                        <input
                                            id="tags"
                                            type="text"
                                            className="form-control"
                                            placeholder="เช่น react, bootstrap, node"
                                        />
                                        <div className="form-text">
                                            คั่นด้วยเครื่องหมายจุลภาค , เช่น <code>arduino, sensor</code>
                                        </div>
                                    </div>

                                    {/* Image (optional) */}
                                    <div className="mb-3">
                                        <label htmlFor="image" className="form-label">รูปภาพปก/ประกอบ (ไม่บังคับ)</label>
                                        <input id="image" type="file" className="form-control" accept="image/*" />
                                        <div className="form-text">รองรับ JPG/PNG/WebP — แนะนำ &lt; 3MB</div>
                                    </div>

                                    {/* Actions (ยังไม่ทำงาน) */}
                                    <div className="d-flex gap-2">
                                        <button type="button" className="btn btn-primary" disabled>
                                            โพสต์กระทู้
                                        </button>
                                        <button type="button" className="btn btn-outline-secondary" disabled>
                                            ล้างฟอร์ม
                                        </button>
                                    </div>
                                </form>

                            </div>
                        </div>
                    </section>
                </main>
                <Footer />
            </div>
        </>
    );
}
