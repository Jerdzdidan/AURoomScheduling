import { Head, usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import Base from "@/Layouts/Base";
import StatsCard from "@/Components/Card/StatsCard";
import ScrollableTable from "@/Components/Table/ScrollableTable";
import FilterTransferHistoryOffcanvas from "./Forms/FilterTransferHistoryOffcanvas";
import { LuArrowRight, LuArrowRightLeft } from "react-icons/lu";

const dayLabels = {
    MONDAY: "Monday",
    TUESDAY: "Tuesday",
    WEDNESDAY: "Wednesday",
    THURSDAY: "Thursday",
    FRIDAY: "Friday",
    SATURDAY: "Saturday",
    SUNDAY: "Sunday",
};

const formatTime = (value) => {
    if (!value) return "—";
    const [h = "0", m = "00"] = value.split(":");
    const d = new Date();
    d.setHours(Number(h), Number(m), 0, 0);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const shortCode = (code) => {
    if (!code) return "";
    const idx = code.indexOf("-");
    return idx !== -1 ? code.substring(idx + 1) : code;
};

export default function TransferScheduleHistory() {
    const page = usePage();
    const {
        branches = [],
        departments = [],
        rooms = [],
        adminUsers = [],
        dayOptions = [],
    } = page.props;

    const tableRef = useRef(null);
    const filtersRef = useRef({
        branch_id: "",
        department_id: "",
        day_of_week: "",
        room_id: "",
        user_id: "",
    });
    const [filters, setFilters] = useState({
        branch_id: "",
        department_id: "",
        day_of_week: "",
        room_id: "",
        user_id: "",
    });

    const applyFilters = (overrideFilters) => {
        const applied = overrideFilters || filters;
        filtersRef.current = { ...applied };
        tableRef.current?.ajax.reload(null, true);
    };

    const loadStats = () => {
        $.get(route("admin.reports.transfer-history.stats")).done((stats) => {
            $("#total-transfers").text(stats.total);
        });
    };

    useEffect(() => {
        loadStats();
        const arrowIcon = renderToString(<LuArrowRight size={14} />);

        const heading = document.createElement("h5");
        heading.classList.add("card-title", "mb-0", "text-md-start", "text-center", "pb-md-0", "pb-6");
        heading.innerHTML = "Schedule Transfer History";

        const table = window.$("#transfer-history-table").DataTable({
            processing: true,
            serverSide: true,
            responsive: true,
            scrollY: "405px",
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
                            text: '<span class="d-flex align-items-center gap-2"><i class="icon-base bx bx-filter-alt icon-sm"></i></span>',
                            className: "btn btn-info me-4",
                            action: function () {
                                $("#filterTransferHistoryOffcanvas").offcanvas("show");
                            },
                        }, {
                            extend: "collection",
                            className: "btn btn-label-primary dropdown-toggle",
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
                $(".dt-buttons").removeClass("btn-group");
            },
            order: [[0, "desc"]],
            ajax: {
                url: route("admin.reports.transfer-history.data"),
                data: function (d) {
                    d.filter_branch_id = filtersRef.current.branch_id;
                    d.filter_department_id = filtersRef.current.department_id;
                    d.filter_day_of_week = filtersRef.current.day_of_week;
                    d.filter_room_id = filtersRef.current.room_id;
                    d.filter_user_id = filtersRef.current.user_id;
                },
            },
            columns: [
                { data: "id", visible: false },
                {
                    data: "transferred_at",
                    width: "14%",
                    render: (data) => `<span class="fw-medium">${data ?? "—"}</span>`,
                },
                {
                    data: "subject_name",
                    width: "22%",
                    render: (data, type, row) => `
                        <div class="d-flex flex-column">
                            <span class="fw-medium">${row.department_code ?? ""} – ${row.department_name ?? ""}</span>
                            <small class="text-muted">${row.branch_code ?? ""}${row.branch_name ? ` – ${row.branch_name}` : ""}</small>
                            <small class="text-muted">${row.subject_code ?? "-"} – ${data ?? "-"}</small>
                            <small class="text-muted">${row.section ?? "-"}</small>
                        </div>
                    `,
                },
                {
                    data: "day_of_week",
                    width: "15%",
                    render: (data, type, row) => `
                        <div class="d-flex flex-column">
                            <span class="fw-medium">${dayLabels[data] ?? data ?? "—"}</span>
                            <small class="text-muted">${formatTime(row.start_time)} – ${formatTime(row.end_time)}</small>
                        </div>
                    `,
                },
                {
                    data: null,
                    width: "25%",
                    orderable: false,
                    render: (data, type, row) => `
                        <div class="d-flex align-items-center gap-2">
                            <div class="d-flex flex-column">
                                <span class="fw-medium text-danger">${shortCode(row.previous_room_code)}</span>
                                <small class="text-muted">${row.previous_building_name ?? ""}</small>
                            </div>
                            <span class="text-muted">${arrowIcon}</span>
                            <div class="d-flex flex-column">
                                <span class="fw-medium text-success">${shortCode(row.transferred_room_code)}</span>
                                <small class="text-muted">${row.transferred_building_name ?? ""}</small>
                            </div>
                        </div>
                    `,
                },
                {
                    data: "remarks",
                    width: "15%",
                    className: "none",
                    render: (data) => {
                        if (!data) return '<span class="text-muted">—</span>';
                        const escaped = data.replace(/"/g, "&quot;");
                        const truncated = data.length > 60 ? data.substring(0, 60) + "…" : data;
                        return `<span title="${escaped}" style="cursor: help;">${truncated}</span>`;
                    },
                },
                {
                    data: "transferred_by_name",
                    width: "9%",
                    render: (data) => data ?? "—",
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
            <Head title="Reports > Transfer History" />

            <Base title="Reports > Transfer History">
                <div className="row mb-4">
                    <StatsCard
                        id="total-transfers"
                        title="Total Transfers"
                        Icon={LuArrowRightLeft}
                        iconSize="28"
                        bgColor="bg-primary"
                        className="col-md-12"
                    />
                </div>

                <div className="card">
                    <div className="card-datatable text-nowrap">
                        <ScrollableTable id="transfer-history-table">
                            <th>Id</th>
                            <th>Date</th>
                            <th>Subject / Section</th>
                            <th>Day / Time</th>
                            <th>Previous Room → Transferred Room</th>
                            <th>Remarks</th>
                            <th>By</th>
                        </ScrollableTable>
                    </div>
                </div>

                <FilterTransferHistoryOffcanvas
                    filters={filters}
                    setFilters={setFilters}
                    branches={branches}
                    departments={departments}
                    rooms={rooms}
                    adminUsers={adminUsers}
                    dayOptions={dayOptions}
                    onApply={applyFilters}
                />
            </Base>
        </>
    );
}
