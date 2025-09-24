import { Link } from "react-router-dom";

function Header_user() {
    return (
        <header className="p-3 text-bg-dark">
            <div className="container">
                <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start">

                    <a
                        href="/"
                        className="d-flex align-items-center mb-2 mb-lg-0 text-white text-decoration-none"
                    >
                        <svg
                            className="bi me-2"
                            width="40"
                            height="32"
                            role="img"
                            aria-label="Bootstrap"
                        >
                            <use xlink:href="#bootstrap"></use>
                        </svg>
                    </a>

                    <ul className="nav col-12 col-lg-auto me-lg-auto mb-2 justify-content-center mb-md-0">
                        <li><a href="#" className="nav-link px-2 text-secondary">Home</a></li>
                    </ul>

                    <form className="col-12 col-lg-auto mb-3 mb-lg-0 me-lg-3" role="search">
                        <input
                            type="search"
                            className="form-control form-control-dark text-bg-dark"
                            placeholder="Search..."
                            aria-label="Search"
                        />
                    </form>

                    <div className="dropdown text-end">
                        <a
                            href="#"
                            id="userMenuToggle"
                            className="d-block link-body-emphasis text-decoration-none dropdown-toggle"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                        >
                            <img
                                src="https://github.com/mdo.png"
                                alt="mdo"
                                width="32"
                                height="32"
                                className="rounded-circle"
                            />
                        </a>

                        <ul className="dropdown-menu dropdown-menu-end text-small" aria-labelledby="userMenuToggle">
                            <li><a className="dropdown-item" href="#">New project...</a></li>
                            <li><a className="dropdown-item" href="#">Settings</a></li>
                            <li><a className="dropdown-item" href="#">Profile</a></li>
                            <li><hr className="dropdown-divider" /></li>
                            <li><Link className="dropdown-item" href="#">Sign out</Link></li>
                        </ul>
                    </div>


                </div>
            </div>
        </header>
    );
}

export default Header_user;