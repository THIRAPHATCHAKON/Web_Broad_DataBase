import { useState } from "react";

export default function EditProfile() {
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john@example.com");
  const [bio, setBio] = useState("สวัสดี! นี่คือ bio ของฉัน");

  function onSaveProfile(e) {
    e.preventDefault();
    alert("Profile updated!");
  }

  return (
    <section className="container my-4">
      <div className="card shadow-sm">
        <div className="card-body">
          <h3 className="mb-3">Edit Profile</h3>
          <form onSubmit={onSaveProfile}>
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="mb-3">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="mb-3">
              <label className="form-label">Bio</label>
              <textarea className="form-control" rows="3" value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>

            <button className="btn btn-primary">Save Changes</button>
          </form>
        </div>
      </div>
    </section>
  );
}
