import { usePage } from '@inertiajs/react';
import SidebarItem from "@/Components/Sidebar/SidebarItem";
import Bar from "@/Components/Sidebar/Bar";
import {
    LuUserRoundCog, LuIdCard, LuCalendarRange, LuHouse, LuBookText,
    LuSchool, LuUniversity, LuDoorOpen, LuGraduationCap, LuBuilding2,
    LuLayoutList, LuUsers
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

            <SidebarItem
                routeName="admin.index"
                Icon={LuHouse}
                name="Home"
            />

            <li className="menu-header small text-uppercase">
                <span className="menu-header-text">Core</span>
            </li>

            <SidebarItem
                routeName="_"
                Icon={LuCalendarRange}
                name="Room Schedule"
            />

            <SidebarItem
                routeName="admin.core.buildings.index"
                Icon={LuBuilding2}
                name="Building"
            />

            <SidebarItem
                routeName="admin.core.rooms.index"
                Icon={LuDoorOpen}
                name="Room"
            />

            <SidebarItem
                routeName="_"
                Icon={LuUsers}
                name="Professor"
            />

            <SidebarItem
                routeName="admin.core.subjects.index"
                Icon={LuBookText}
                name="Subjects"
            />

            <li className="menu-header small text-uppercase">
                <span className="menu-header-text">User Management</span>
            </li>

            <SidebarItem
                routeName="admin.users.officer-accounts.index"
                Icon={LuIdCard}
                name="Officer"
            />

            <SidebarItem
                routeName="admin.users.admin-accounts.index"
                Icon={LuUserRoundCog}
                name="Admin"
            />

            <li className="menu-header small text-uppercase">
                <span className="menu-header-text">Utilities</span>
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
                routeName="admin.utilities.programs.index"
                Icon={LuGraduationCap}
                name="Programs"
            />
        </Bar>
    );
}

function Officer() {
    return (
        <Bar>
            {/* <SidebarItem */}
            {/*     routeName="officer.index" */}
            {/*     Icon={BiHome} */}
            {/*     name="Home" */}
            {/* /> */}
        </Bar>
    );
}

export default function Sidebar() {
    const { auth } = usePage().props;
    const user_type = auth.user.user_type;

    return user_type === "OFFICER" ? <Officer /> : <Admin />;
}
