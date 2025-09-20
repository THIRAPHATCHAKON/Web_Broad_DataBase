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