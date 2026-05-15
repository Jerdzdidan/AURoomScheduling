import { Head } from "@inertiajs/react";
import { useEffect, useRef } from "react";
import Base from "@/Layouts/Base";
import ScrollableTable from "@/Components/Table/ScrollableTable";

export default function ScheduleReassignment() {
    const tableRef = useRef(null);

    useEffect(() => {
        const heading = document.createElement("h5");
        heading.classList.add("card-title", "mb-0", "text-md-start", "text-center", "pb-md-0", "pb-6");
        heading.innerHTML = "Schedule Reassignments";

        const table = window.$("#reassignment-table").DataTable({
            processing: true,
            serverSide: true,
            responsive: true,
            scrollY: "500px",
            scrollX: true,
            layout: {
                topStart: {
                    rowClass: "row mx-3 my-0 justify-content-between",
                    features: [{
                        pageLength: {
                            menu: [10, 25, 50, 100],
                            text: "Show_MENU_entries",
                        },
                    }],
                },
                top2Start: {
                    rowClass: "row card-header flex-column flex-md-row pb-0",
                    features: [heading],
                },
                top2End: {
                    features: [{
                        buttons: [{
                            extend: "collection",
                            className: "btn btn-label-primary dropdown-toggle me-4",
                            text: '<span class="d-flex align-items-center gap-2"><i class="icon-base bx bx-export me-sm-1"></i> <span class="d-none d-sm-inline-block">Export</span></span>',
                            buttons: [{
                                extend: "csv",
                                text: '<span class="d-flex align-items-center"><i class="icon-base bx bx-file me-1"></i>Csv</span>',
                                className: "dropdown-item",
                                exportOptions: {
                                    columns: [1, 2, 3, 4, 5, 6],
                                },
                            }],
                        }],
                    }],
                },
                topEnd: {
                    search: {
                        placeholder: "",
                    },
                },
                bottomStart: {
                    rowClass: "row mx-3 justify-content-between",
                    features: ["info"],
                },
                bottomEnd: {
                    paging: {
                        firstLast: false,
                    },
                },
            },
            language: {
                paginate: {
                    next: '<i class="icon-base bx bx-chevron-right scaleX-n1-rtl icon-sm"></i>',
                    previous: '<i class="icon-base bx bx-chevron-left scaleX-n1-rtl icon-sm"></i>',
                },
            },
            autoWidth: false,
            initComplete: function () {
                window.$(".dt-buttons").removeClass("btn-group");
            },
            order: [[0, "desc"]],
            ajax: route("admin.reports.schedule-reassignment.data"),
            columns: [
                { data: "id", visible: false },
                {
                    data: "created_at",
                    title: "Date",
                    width: "15%",
                },
                {
                    data: "subject_name",
                    title: "Subject / Schedule",
                    width: "25%",
                    render: (data, type, row) => `
                        <div class="d-flex flex-column">
                            <span class="fw-medium">${row.subject_code} - ${data}</span>
                            <small class="text-muted">Section ${row.section}</small>
                            <small class="text-muted">${row.schedule_info}</small>
                        </div>
                    `,
                },
                {
                    data: "previous_room_code",
                    title: "From Room",
                    width: "12%",
                },
                {
                    data: "new_room_code",
                    title: "To Room",
                    width: "12%",
                    render: (data) => `<span class="fw-bold text-primary">${data}</span>`,
                },
                {
                    data: "remarks",
                    title: "Remarks",
                    width: "20%",
                },
                {
                    data: "creator_name",
                    title: "Transferred By",
                    width: "15%",
                },
            ],
        });

        tableRef.current = table;

        return () => {
            table.destroy();
        };
    }, []);

    return (
        <>
            <Head title="Reports > Schedule Reassignments" />

            <Base title="Reports > Schedule Reassignments">
                <div className="card">
                    <div className="card-datatable text-nowrap">
                        <ScrollableTable id="reassignment-table">
                            <th>Id</th>
                            <th>Date</th>
                            <th>Subject / Schedule</th>
                            <th>From Room</th>
                            <th>To Room</th>
                            <th>Remarks</th>
                            <th>Transferred By</th>
                        </ScrollableTable>
                    </div>
                </div>
            </Base>
        </>
    );
}
