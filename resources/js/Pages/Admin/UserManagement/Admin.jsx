import { usePage, Head } from "@inertiajs/react";
import { useEffect, useRef } from "react";
import Base from "@/Layouts/Base";
import StatsCard from "@/Components/Card/StatsCard";
import { LuUsersRound, LuUserRoundCheck, LuUserRoundX } from "react-icons/lu";
import ScrollableTable from "@/Components/Table/ScrollableTable";

export default function Admin() {
    // const tableRef = useRef(null);
    //
    // useEffect(() => {
    //     const table = window.$(tableRef.current).DataTable({
    //         processing: true,
    //         serverSide: true,
    //         ajax: '',
    //         columns: [
    //             // { data: 'name' },
    //             // { data: 'email' },
    //             // { data: 'created_at' },
    //         ],
    //     });
    //
    //     // Cleanup on unmount — very important!
    //     return () => {
    //         table.destroy();
    //     };
    // }, []);

    return (
        <>
            <Head title="User Management > Admin" />

            <Base title="User Management > Admin">
                <div className="row mb-4">
                    <StatsCard
                        id="total"
                        title="Total Admins"
                        Icon={LuUsersRound}
                        iconSize="28"
                        bgColor="bg-primary"
                        className="col-md-4"
                    />

                    <StatsCard
                        id="active"
                        Icon={LuUserRoundCheck}
                        iconSize="28"
                        title="Active Admins"
                        bgColor="bg-success"
                        className="col-md-4"
                    />

                    <StatsCard
                        id="inactive"
                        Icon={LuUserRoundX}
                        iconSize="28"
                        title="Inactive Admins"
                        bgColor="bg-danger"
                        className="col-md-4"
                    />
                </div>

                <div className="card">
                    {/* <h5 class="card-header pb-0 text-md-start text-center">Scrollable Table</h5> */}
                    <div className="card-datatable text-nowrap">
                        <ScrollableTable>
                            <th>Id</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </ScrollableTable>
                    </div>
                </div>
            </Base>
        </>
    );
}
