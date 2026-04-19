import { Head, usePage, useRemember } from "@inertiajs/react";
import { useEffect, useMemo, useRef } from "react";
import { renderToString } from "react-dom/server";
import Base from "@/Layouts/Base";
import StatsCard from "@/Components/Card/StatsCard";
import ScrollableTable from "@/Components/Table/ScrollableTable";
import CreateAndEditRoomSchedule from "./Forms/CreateAndEditRoomSchedule";
import { LuCalendarRange, LuDoorOpen, LuSchool } from "react-icons/lu";
import { BiSolidEdit, BiSolidTrash } from "react-icons/bi";

const formatTime = (value) => {
    if (!value) {
        return "-";
    }

    const [hour = "0", minute = "00"] = value.split(":");
    const date = new Date();

    date.setHours(Number(hour), Number(minute), 0, 0);

    return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
    });
};

const isCurrentPeriod = (value) => Number(value) === 1 || value === true;

export default function RoomSchedule() {
    const {
        academicPeriods = [],
        branches = [],
        departments = [],
        programs = [],
        subjects = [],
        rooms = [],
        currentAcademicPeriodId = null,
        dayOptions = [],
    } = usePage().props;
    const tableRef = useRef(null);
    const [editId, setEditId] = useRemember(null, "roomScheduleEditId");

    const dayLabels = useMemo(
        () => Object.fromEntries(dayOptions.map((option) => [option.id, option.name])),
        [dayOptions],
    );

    const loadStats = () => {
        $.get(route("admin.core.room-schedules.stats")).done((stats) => {
            $("#total").text(stats.total);
            $("#current-period").text(stats.current_period);
            $("#rooms-in-use").text(stats.rooms_in_use);
        });
    };

    useEffect(() => {
        loadStats();

        const heading = document.createElement("h5");
        heading.classList.add("card-title", "mb-0", "text-md-start", "text-center", "pb-md-0", "pb-6");
        heading.innerHTML = "Room Schedules";

        const table = window.$("#room-schedule-table").DataTable({
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
                            extend: "collection",
                            className: "btn btn-label-primary dropdown-toggle me-4",
                            text: '<span class="d-flex align-items-center gap-2"><i class="icon-base bx bx-export me-sm-1"></i> <span class="d-none d-sm-inline-block">Export</span></span>',
                            buttons: [{
                                extend: "csv",
                                text: '<span class="d-flex align-items-center"><i class="icon-base bx bx-file me-1"></i>Csv</span>',
                                className: "dropdown-item",
                                exportOptions: {
                                    columns: [1, 2, 3, 4, 5],
                                },
                            }],
                        }, {
                            text: '<span class="d-flex align-items-center gap-2"><i class="icon-base bx bx-plus icon-sm"></i> <span class="d-none d-sm-inline-block">Add Schedule</span></span>',
                            className: "create-new btn btn-primary",
                            action: function () {
                                setEditId(null);
                                $("#roomScheduleOffcanvas").offcanvas("show");
                            },
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
            ajax: route("admin.core.room-schedules.data"),
            columns: [
                { data: "id", visible: false },
                {
                    data: "academic_period_name",
                    width: "20%",
                    render: (data, type, row) => {
                        const currentBadge = isCurrentPeriod(row.is_current_period)
                            ? `<span class="badge bg-label-success" style="width: fit-content;">Current</span>`
                            : "";

                        return `
                            <div class="d-flex flex-column">
                                <span class="fw-medium">${data ?? "-"}</span>
                                ${currentBadge}
                            </div>
                        `;
                    },
                },
                {
                    data: "subject_name",
                    width: "22%",
                    render: (data, type, row) => `
                        <div class="d-flex flex-column">
                            <span class="fw-medium">${row.subject_code ?? "-"}</span>
                            <small class="text-muted">${data ?? "-"}</small>
                            <small class="text-muted">${row.program_code ?? ""}${row.program_name ? ` - ${row.program_name}` : ""}</small>
                            <small class="text-muted">${row.department_code ?? ""}${row.department_name ? ` - ${row.department_name}` : ""}</small>
                            <small class="text-muted">${row.branch_code ?? ""}${row.branch_name ? ` - ${row.branch_name}` : ""}</small>
                            <small class="text-muted">Section ${row.section ?? "-"}</small>
                        </div>
                    `,
                },
                {
                    data: "room_code",
                    width: "18%",
                    render: (data, type, row) => `
                        <div class="d-flex flex-column">
                            <span class="fw-medium">${data ?? "-"}</span>
                            <small class="text-muted">${row.building_code ?? ""} ${row.building_name ? `- ${row.building_name}` : ""}</small>
                            <small class="text-muted">${row.room_type ?? "-"}</small>
                        </div>
                    `,
                },
                {
                    data: "day_of_week",
                    width: "18%",
                    render: (data, type, row) => `
                        <div class="d-flex flex-column">
                            <span class="fw-medium">${dayLabels[data] ?? data ?? "-"}</span>
                            <small class="text-muted">${formatTime(row.start_time)} - ${formatTime(row.end_time)}</small>
                        </div>
                    `,
                },
                {
                    data: "professor_name",
                    width: "12%",
                    render: (data) => data ?? "-",
                },
                {
                    data: null,
                    orderable: false,
                    width: "10%",
                    render: (data, type, row) => {
                        const editIcon = renderToString(<BiSolidEdit size={16} />);
                        const deleteIcon = renderToString(<BiSolidTrash size={16} />);

                        return `
                            <button class="btn btn-sm btn-outline-warning me-1" title="Edit schedule" onclick="roomScheduleCRUD.edit('${row.id}')">
                                ${editIcon}
                            </button>

                            <button class="btn btn-sm btn-outline-danger" title="Delete schedule" onclick="roomScheduleCRUD.delete('${row.id}', '${row.subject_code}', '${row.section}')">
                                ${deleteIcon}
                            </button>
                        `;
                    },
                },
            ],
        });

        tableRef.current = table;
        window.roomScheduleCRUD = window.roomScheduleCRUD || {};

        window.roomScheduleCRUD.edit = (id) => {
            setEditId(id);
            $("#roomScheduleOffcanvas").offcanvas("show");
        };

        window.roomScheduleCRUD.delete = (id, subjectCode, section) => {
            Swal.fire({
                title: "Delete Room Schedule",
                text: `Are you sure you want to delete the ${subjectCode} / ${section} schedule?`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes, delete",
                cancelButtonText: "Cancel",
                customClass: {
                    confirmButton: "btn btn-danger me-3",
                    cancelButton: "btn btn-label-secondary",
                },
                buttonsStyling: false,
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: route("admin.core.room-schedules.delete", id),
                        type: "DELETE",
                    })
                        .done((res) => {
                            toastr.success(res.message || "Room schedule deleted successfully.");
                            tableRef.current?.ajax.reload(null, false);
                            loadStats();
                        })
                        .fail((xhr) => {
                            const message = xhr.responseJSON?.message || "Failed to delete room schedule.";
                            toastr.error(message);
                        });
                }
            });
        };

        return () => {
            table.destroy();
            delete window.roomScheduleCRUD;
        };
    }, [dayLabels]);

    const handleSuccess = () => {
        setEditId(null);

        if (tableRef.current) {
            tableRef.current.ajax.reload(null, false);
        }

        loadStats();
    };

    return (
        <>
            <Head title="Core > Room Schedule" />

            <Base title="Core > Room Schedule">
                <div className="row mb-4">
                    <StatsCard
                        id="total"
                        title="Total Schedules"
                        Icon={LuCalendarRange}
                        iconSize="28"
                        bgColor="bg-primary"
                        className="col-xl-4 col-md-6"
                    />

                    <StatsCard
                        id="current-period"
                        title="Current Period Entries"
                        Icon={LuSchool}
                        iconSize="28"
                        bgColor="bg-success"
                        className="col-xl-4 col-md-6"
                    />

                    <StatsCard
                        id="rooms-in-use"
                        title="Rooms In Use"
                        Icon={LuDoorOpen}
                        iconSize="28"
                        bgColor="bg-info"
                        className="col-xl-4 col-md-6"
                    />
                </div>

                <div className="card">
                    <div className="card-datatable text-nowrap">
                        <ScrollableTable id="room-schedule-table">
                            <th>Id</th>
                            <th>Academic Period</th>
                            <th>Subject / Section</th>
                            <th>Room</th>
                            <th>Schedule</th>
                            <th>Professor</th>
                            <th>Actions</th>
                        </ScrollableTable>
                    </div>
                </div>

                <CreateAndEditRoomSchedule
                    editId={editId}
                    academicPeriods={academicPeriods}
                    branches={branches}
                    departments={departments}
                    programs={programs}
                    subjects={subjects}
                    rooms={rooms}
                    currentAcademicPeriodId={currentAcademicPeriodId}
                    dayOptions={dayOptions}
                    onSuccess={handleSuccess}
                />
            </Base>
        </>
    );
}
