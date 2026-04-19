import { Link } from '@inertiajs/react';

export default function SidebarItem({ className = '', routeName, param, Icon, name }) {
    const isActive = route().current(routeName);

    return (
        <>
            <li className={`menu-item ${className} ${isActive ? 'active' : ''}`}>
                <Link href={route(routeName, param)} className="menu-link text-white">
                    {Icon && <Icon size={20} />}
                    <div className="ms-2 text-truncate" data-i18n={name}>
                        {name}
                    </div>
                </Link>
            </li>
        </>
    );
}
