import { Link, usePage } from '@inertiajs/react';

export default function Bar({ children }) {
    const { auth } = usePage().props;
    const user_type = auth.user.user_type;
    const url = user_type === "OFFICER" ? "officer.index" : "admin.index";

    return (
        <aside id="layout-menu" className="layout-menu menu-vertical menu bg-menu-theme">
            <div className="app-brand demo">
                <Link href={route(url)} className="app-brand-link ms-2">
                    <span className="app-brand-logo demo">
                        <img src="/img/logo/arellano_logo.png" alt="" />
                    </span>
                    <span className="app-brand-text demo menu-text fw-bold ms-4">AU-AIS</span>
                </Link>
            </div>
            <div className="menu-divider mt-0"></div>
            <div className="menu-inner-shadow"></div>
            <ul className="menu-inner py-1">
                {children}
            </ul>
        </aside>
    );
}
