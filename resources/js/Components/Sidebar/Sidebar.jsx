import { Link, usePage } from '@inertiajs/react';
import React, { useMemo, useState, useEffect } from 'react';
import SidebarItem from "@/Components/Sidebar/SidebarItem";
import Bar from "@/Components/Sidebar/Bar";
import {
    LuCalendarRange, LuHouse, LuBookText,
    LuSchool, LuUniversity, LuDoorOpen, LuBuilding2,
    LuLayoutList, LuUsers, LuIdCard, LuPlus, LuSearch,
    LuCalendarCheck, LuArrowRightLeft,
} from "react-icons/lu";

function Admin() {
    // const adminLinks = [
    //     { routeName: "admin.index", Icon: BiHome, name: "Home" },
    //     { routeName: "admin.users", Icon: BiUser, name: "Users" },
    //     { routeName: "admin.settings", Icon: BiCog, name: "Settings" },
    // ];

    return (
        <Bar>
            {/* {adminLinks.map((item) => ( */}
            {/*     <SidebarItem */}
            {/*         key={item.routeName} */}
            {/*         routeName={item.routeName} */}
            {/*         Icon={item.Icon} */}
            {/*         name={item.name} */}
            {/*     /> */}
            {/* ))} */}

            <div className="mt-1">

            </div>

            <SidebarItem
                routeName="admin.index"
                Icon={LuHouse}
                name="Home"
            />

            <li className="menu-header small text-uppercase">
                <span className="menu-header-text text-white">Core</span>
            </li>

            <SidebarItem
                routeName="admin.core.room-schedules.index"
                Icon={LuCalendarRange}
                name="Room Schedule"
            />

            {/* <SidebarItem */}
            {/*     routeName="_" */}
            {/*     Icon={LuUsers} */}
            {/*     name="Professor" */}
            {/* /> */}

            <SidebarItem
                routeName="admin.core.subjects.index"
                Icon={LuBookText}
                name="Subjects"
            />

            <li className="menu-header small text-uppercase">
                <span className="menu-header-text text-white">Reports</span>
            </li>

            <SidebarItem
                routeName="admin.reports.room-utilization.index"
                Icon={LuCalendarCheck}
                name="Room Utilization"
            />

            <SidebarItem
                routeName="admin.reports.transfer-history.index"
                Icon={LuArrowRightLeft}
                name="Transfer History"
            />

            <li className="menu-header small text-uppercase">
                <span className="menu-header-text text-white">User Management</span>
            </li>

            <SidebarItem
                routeName="admin.users.index"
                Icon={LuUsers}
                name="Users"
            />

            <li className="menu-header small text-uppercase">
                <span className="menu-header-text text-white">Utilities</span>
            </li>

            <SidebarItem
                routeName="admin.utilities.academic-periods.index"
                Icon={LuSchool}
                name="Academic Period"
            />

            <SidebarItem
                routeName="admin.utilities.branches.index"
                Icon={LuUniversity}
                name="Branch"
            />

            <SidebarItem
                routeName="admin.utilities.departments.index"
                Icon={LuLayoutList}
                name="Departments"
            />

            <SidebarItem
                routeName="admin.utilities.buildings.index"
                Icon={LuBuilding2}
                name="Building"
            />

            <SidebarItem
                routeName="admin.utilities.rooms.index"
                Icon={LuDoorOpen}
                name="Room"
            />

            <SidebarItem
                routeName="admin.utilities.professors.index"
                Icon={LuIdCard}
                name="Professors"
            />

        </Bar>
    );
}

function Officer() {
    const page = usePage();
    const { officerRooms = [] } = page.props;
    const [search, setSearch] = useState("");

    const selectedRoomId = useMemo(() => {
        const query = page.url.split("?")[1] ?? "";

        return new URLSearchParams(query).get("room_id");
    }, [page.url]);

    // Strip branch code prefix: "BRN-BLD-101" → "BLD-101"
    const shortCode = (code) => {
        if (!code) return "";
        const idx = code.indexOf("-");
        return idx !== -1 ? code.substring(idx + 1) : code;
    };

    // Filter rooms by search
    const filteredRooms = useMemo(() => {
        if (!search.trim()) return officerRooms;

        const q = search.trim().toLowerCase();

        return officerRooms.filter(
            (room) =>
                room.code?.toLowerCase().includes(q) ||
                room.type?.toLowerCase().includes(q) ||
                room.building_name?.toLowerCase().includes(q) ||
                room.building_code?.toLowerCase().includes(q),
        );
    }, [officerRooms, search]);

    // Group by building
    const grouped = useMemo(() => {
        const map = new Map();

        filteredRooms.forEach((room) => {
            const key = room.building_id ?? "unknown";

            if (!map.has(key)) {
                map.set(key, {
                    building_id: room.building_id,
                    building_name: room.building_name ?? "Unknown Building",
                    building_code: room.building_code ?? "",
                    rooms: [],
                });
            }

            map.get(key).rooms.push(room);
        });

        return [...map.values()].map((group) => ({
            ...group,
            rooms: [...group.rooms].sort((a, b) => {
                if (a.is_assigned_to_department !== b.is_assigned_to_department) {
                    return Number(b.is_assigned_to_department) - Number(a.is_assigned_to_department);
                }

                return (a.code ?? "").localeCompare(b.code ?? "", undefined, { numeric: true });
            }),
        }));
    }, [filteredRooms]);

    useEffect(() => {
        if (window.Helpers && window.Helpers.menuPsScroll) {
            window.Helpers.menuPsScroll.update();
        }
    }, [grouped]);

    return (
        <Bar>
            <div className="mt-1"></div>

            <li className="menu-item px-3 pt-2 pb-2">
                <Link
                    href={route("officer.schedules.create")}
                    className={`officer-sidebar-create ${route().current("officer.schedules.create") ? "active" : ""}`}
                >
                    <LuPlus size={18} />
                    <span>Create</span>
                </Link>
            </li>

            <li className="menu-item mb-0">
                <div style={{ padding: "0.5rem 1rem" }}>
                    <div className="officer-sidebar-search-wrap" style={{ width: "100%" }}>
                        <LuSearch size={14} className="search-icon" />
                        <input
                            type="text"
                            className="officer-sidebar-search"
                            placeholder="Search rooms..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </li>

            {grouped.length === 0 && (
                <li>
                    <div className="officer-sidebar-empty">
                        {search.trim() ? "No matching rooms" : "No rooms available in this branch"}
                    </div>
                </li>
            )}

            {grouped.map((group) => (
                <React.Fragment key={group.building_id}>
                    <li className="menu-header small text-uppercase">
                        <span className="menu-header-text text-white">
                            {group.building_code ? `${group.building_code} – ${group.building_name}` : group.building_name}
                        </span>
                    </li>

                    {group.rooms.map((room) => (
                        <li
                            key={room.id}
                            className={`menu-item ${String(room.id) === String(selectedRoomId) ? "active" : ""}`}
                        >
                            <Link
                                href={`${route("officer.index")}?room_id=${room.id}`}
                                className="menu-link text-white"
                                preserveState
                            >
                                <LuDoorOpen size={20} />
                                <div className="ms-2 text-truncate">{shortCode(room.code)}</div>
                                {room.is_assigned_to_department && (
                                    <span className="officer-sidebar-room-badge">Assigned</span>
                                )}
                            </Link>
                        </li>
                    ))}
                </React.Fragment>
            ))}
        </Bar>
    );
}

export default function Sidebar() {
    const { auth } = usePage().props;
    const user_type = auth.user.user_type;

    return user_type === "OFFICER" ? <Officer /> : <Admin />;
}
