import { usePage } from '@inertiajs/react';
import SidebarItem from "@/Components/Sidebar/SidebarItem";
import Bar from "@/Components/Sidebar/Bar";
import { BiHome, BiSolidUser } from "react-icons/bi";

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
                Icon={BiHome}
                name="Home"
            />
            <SidebarItem
                routeName="admin.users.index"
                Icon={BiSolidUser}
                name="User Management"
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
