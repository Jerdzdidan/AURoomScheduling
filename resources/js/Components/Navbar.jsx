import { usePage, Link } from '@inertiajs/react';

export default function Navbar({ title }) {
    const { auth } = usePage().props;
    const user = auth.user;

    return (
        <nav className="layout-navbar container-fluid navbar-detached navbar navbar-expand-xl align-items-center bg-navbar-theme" id="layout-navbar">
            <div className="layout-menu-toggle navbar-nav align-items-xl-center me-4 me-xl-0 d-xl-none">
                <a className="nav-item nav-link px-0 me-xl-6" href="#!" onClick={(e) => { e.preventDefault(); window.Helpers.toggleCollapsed(); }}>
                    <i className="icon-base bx bx-menu icon-md"></i>
                </a>
            </div>
            <div className="navbar-nav-right d-flex align-items-center justify-content-end" id="navbar-collapse">
                {/* Title */}
                    <div className="nav-item d-flex align-items-center me-auto">
                        {typeof title === 'string' && title.includes('>') ? (
                            <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.95rem' }}>
                                {title.split('>').map((part, index, arr) => {
                                    const isLast = index === arr.length - 1;
                                    return (
                                        <div key={index} className="d-flex align-items-center gap-2">
                                            <span className={isLast ? "text-body fw-medium" : "text-secondary"}>
                                                {part.trim()}
                                            </span>
                                            {!isLast && <i className="icon-base bx bx-chevron-right text-secondary"></i>}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <h5 className="mb-0 fw-medium text-body" style={{ fontSize: '1.1rem' }}>{title}</h5>
                        )}
                    </div>
                {/* /Title */}

                <ul className="navbar-nav flex-row align-items-center ms-md-auto">
                    <li className="nav-item lh-1 me-4 text-end">
                        <h6 className="mb-0">{user.name}</h6>
                        <small className="text-body-secondary">{user.user_type}</small>
                    </li>

                    {/* User Dropdown */}
                    <li className="nav-item navbar-dropdown dropdown-user dropdown">
                        <a className="nav-link dropdown-toggle hide-arrow p-0" href="#!" data-bs-toggle="dropdown">
                            <div className="avatar avatar-online">
                                <img src="/img/profile/default.png" alt="" className="w-px-40 h-auto rounded-circle" />
                            </div>
                        </a>
                        <ul className="dropdown-menu dropdown-menu-end">
                            <li>
                                <a className="dropdown-item" href="#">
                                    <div className="d-flex">
                                        <div className="flex-shrink-0 me-3">
                                            <div className="avatar avatar-online">
                                                <img src="/img/profile/default.png" alt="" className="w-px-40 h-auto rounded-circle" />
                                            </div>
                                        </div>
                                        <div className="flex-grow-1">
                                            <h6 className="mb-0">{user.name}</h6>
                                            <small className="text-body-secondary">{user.user_type}</small>
                                        </div>
                                    </div>
                                </a>
                            </li>
                            <li><div className="dropdown-divider my-1"></div></li>
                            <li>
                                <a className="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#settingsModal">
                                    <i className="icon-base bx bx-cog icon-md me-3"></i>
                                    <span>Settings</span>
                                </a>
                            </li>
                            <li><div className="dropdown-divider my-1"></div></li>
                            <li>
                                <Link className="dropdown-item" href={route('auth.logout', { user_type: user.user_type })}>
                                    <i className="icon-base bx bx-power-off icon-md me-3"></i>
                                    <span>Log Out</span>
                                </Link>
                            </li>
                        </ul>
                    </li>
                    {/* /User Dropdown */}
                </ul>
            </div>
        </nav>
    );
}
