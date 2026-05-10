import { Head, router, usePage } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import Base from "@/Layouts/Base";
import StatsCard from "@/Components/Card/StatsCard";
import ScrollableTable from "@/Components/Table/ScrollableTable";
import SelectField from "@/Components/Input/SelectField";
import ScheduleCalendarGrid from "@/Components/Schedule/ScheduleCalendarGrid";
import FilterRoomScheduleOffcanvas from "./Forms/FilterRoomScheduleOffcanvas";
import AdminInlineSchedulePopover from "./Forms/AdminInlineSchedulePopover";
import { LuCalendarRange, LuDoorOpen, LuSchool, LuArrowLeft, LuLayoutGrid, LuLayoutList } from "react-icons/lu";
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

const semesterLabels = {
    "1ST": "1st Semester",
    "2ND": "2nd Semester",
    "SUMMER": "SUMMER",
};

const formatAcademicPeriod = (row) => {
    if (row?.academic_period_academic_year && row?.academic_period_semester) {
        return `A.Y. ${row.academic_period_academic_year} - ${semesterLabels[row.academic_period_semester] ?? row.academic_period_semester}`;
    }

    return row?.academic_period_name ?? "-";
};

const isCurrentPeriod = (value) => Number(value) === 1 || value === true;

// Strip branch code prefix
const shortCode = (code) => {
    if (!code) return "";
    const idx = code.indexOf("-");
    return idx !== -1 ? code.substring(idx + 1) : code;
};

const formatPeriod = (period) => {
    if (!period) return "Select a period";
    if (period.academic_year && period.semester) {
        return `A.Y. ${period.academic_year} – ${semesterLabels[period.semester] ?? period.semester}`;
    }
    return period.name || "Unknown";
};

export default function RoomSchedule() {
    const page = usePage();
    const {
        academicPeriods = [],
        branches = [],
        departments = [],
        subjects = [],
        rooms = [],
        professors = [],
        dayOptions = [],
        currentAcademicPeriodId = null,
    } = page.props;

    // Parse URL query params for deep-link support
    const getSavedState = (key, defaultVal) => {
        try {
            const saved = sessionStorage.getItem(`roomScheduleState_${key}`);
            return saved !== null ? saved : defaultVal;
        } catch {
            return defaultVal;
        }
    };

    const initialView = getSavedState("viewMode", "table");
    const initialRoomId = getSavedState("gridRoomId", "");
    const initialPeriodId = getSavedState("gridPeriodId", currentAcademicPeriodId ? String(currentAcademicPeriodId) : "");
    const initialGridBranchId = getSavedState("gridBranchId", "");

    // View mode
    const [viewMode, setViewMode] = useState(initialView);

    // ── Table view state ──────────────────────────────────
    const tableRef = useRef(null);
    const filtersRef = useRef({
        academic_period_id: "",
        branch_id: "",
        department_id: "",
        subject_id: "",
        day_of_week: "",
        room_id: "",
    });
    const [filters, setFilters] = useState({
        academic_period_id: "",
        branch_id: "",
        department_id: "",
        subject_id: "",
        day_of_week: "",
        room_id: "",
    });

    const dayLabels = useMemo(
        () => Object.fromEntries(dayOptions.map((option) => [option.id, option.name])),
        [dayOptions],
    );

    // ── Grid view state ───────────────────────────────────
    const [gridBranchId, setGridBranchId] = useState(initialGridBranchId);
    const [gridRoomId, setGridRoomId] = useState(initialRoomId);
    const [gridPeriodId, setGridPeriodId] = useState(initialPeriodId);
    const [gridSchedules, setGridSchedules] = useState([]);
    const [gridLoading, setGridLoading] = useState(false);
    const [popoverData, setPopoverData] = useState(null);
    const [statsCollapsed, setStatsCollapsed] = useState(false);
    const calendarRef = useRef(null);

    useEffect(() => {
        try {
            sessionStorage.setItem("roomScheduleState_viewMode", viewMode);
            sessionStorage.setItem("roomScheduleState_gridBranchId", gridBranchId);
            sessionStorage.setItem("roomScheduleState_gridRoomId", gridRoomId);
            sessionStorage.setItem("roomScheduleState_gridPeriodId", gridPeriodId);
        } catch (e) {
            // ignore
        }
    }, [viewMode, gridBranchId, gridRoomId, gridPeriodId]);

    const gridRoom = useMemo(
        () => rooms.find((r) => String(r.id) === String(gridRoomId)),
        [rooms, gridRoomId],
    );

    const gridFilteredRooms = useMemo(() => {
        if (!gridBranchId) return [];
        return rooms.filter((r) => String(r.branch_id) === String(gridBranchId));
    }, [rooms, gridBranchId]);

    const sortedAcademicPeriods = useMemo(() => {
        const semesterOrder = { "SUMMER": 3, "2ND": 2, "1ST": 1 };

        const sorted = [...academicPeriods].sort((a, b) => {
            const yearCmp = (b.academic_year || "").localeCompare(a.academic_year || "");
            if (yearCmp !== 0) return yearCmp;
            return (semesterOrder[b.semester] || 0) - (semesterOrder[a.semester] || 0);
        });

        const current = sorted.filter((p) => p.is_current);
        const rest = sorted.filter((p) => !p.is_current);

        return [...current, ...rest];
    }, [academicPeriods]);

    // ── Table logic ───────────────────────────────────────
    const loadStats = () => {
        $.get(route("admin.core.room-schedules.stats")).done((stats) => {
            $("#total").text(stats.total);
            $("#current-period").text(stats.current_period);
            $("#rooms-in-use").text(stats.rooms_in_use);
        });
    };

    useEffect(() => {
        loadStats();
    }, []);

    useEffect(() => {
        if (viewMode !== "table") return;

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
                            text: '<span class="d-flex align-items-center gap-2"><i class="icon-base bx bx-filter-alt icon-sm"></i></span>',
                            className: "btn btn-info me-4",
                            action: function () {
                                $("#filterRoomScheduleOffcanvas").offcanvas("show");
                            },
                        }, {
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
                                router.get(route("admin.core.room-schedules.create"));
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
            initComplete: function () {
                $(".dt-buttons").removeClass("btn-group");
            },
            order: [[0, "desc"]],
            ajax: {
                url: route("admin.core.room-schedules.data"),
                data: function (d) {
                    d.filter_academic_period_id = filtersRef.current.academic_period_id;
                    d.filter_branch_id = filtersRef.current.branch_id;
                    d.filter_department_id = filtersRef.current.department_id;
                    d.filter_subject_id = filtersRef.current.subject_id;
                    d.filter_day_of_week = filtersRef.current.day_of_week;
                    d.filter_room_id = filtersRef.current.room_id;
                },
            },
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
                                <span class="fw-medium">${formatAcademicPeriod(row)}</span>
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
            router.get(route("admin.core.room-schedules.edit", id));
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
    }, [dayLabels, viewMode]);

    const applyFilters = (overrideFilters) => {
        filtersRef.current = { ...(overrideFilters ?? filters) };
        if (tableRef.current) {
            tableRef.current.ajax.reload(null, true);
        }
    };

    // ── Grid logic ────────────────────────────────────────
    const loadGridSchedules = useCallback(() => {
        if (!gridRoomId || !gridPeriodId) {
            setGridSchedules([]);
            return;
        }

        setGridLoading(true);

        $.get(route("admin.core.room-schedules.grid-data"), {
            room_id: gridRoomId,
            academic_period_id: gridPeriodId,
        })
            .done((response) => {
                setGridSchedules(response.schedules ?? []);
            })
            .fail(() => {
                toastr.error("Failed to load schedules.");
                setGridSchedules([]);
            })
            .always(() => {
                setGridLoading(false);
            });
    }, [gridRoomId, gridPeriodId]);

    useEffect(() => {
        if (viewMode === "grid") {
            loadGridSchedules();
        }
    }, [loadGridSchedules, viewMode]);

    const handleGridEdit = (id) => {
        router.get(route("admin.core.room-schedules.edit", id));
    };

    const handleGridDelete = (id, subjectCode, section) => {
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
                        loadGridSchedules();
                    })
                    .fail((xhr) => {
                        const message = xhr.responseJSON?.message || "Failed to delete room schedule.";
                        toastr.error(message);
                    });
            }
        });
    };

    const handleEmptyClick = ({ day, startTime, endTime, anchorRect }) => {
        if (!gridRoom || !gridPeriodId) return;

        if (!currentAcademicPeriodId) {
            toastr.warning("No current academic period is set.");
            return;
        }

        if (String(gridPeriodId) !== String(currentAcademicPeriodId)) {
            toastr.warning("You can only create new schedules in the current academic period.");
            return;
        }

        setPopoverData({ day, startTime, endTime, anchorRect });
    };

    const handlePopoverClose = () => {
        setPopoverData(null);
    };

    const handlePopoverSaved = () => {
        setPopoverData(null);
        loadGridSchedules();
    };

    return (
        <>
            <Head title="Core > Room Schedule" />

            <Base title="Core > Room Schedule">
                {/* View Mode Toggle */}
                <div className="d-flex align-items-center gap-2 mb-3 justify-content-end">
                    <div className="btn-group" role="group">
                        <button
                            type="button"
                            className={`btn btn-sm ${viewMode === "table" ? "btn-primary" : "btn-outline-primary"} d-flex align-items-center gap-1`}
                            onClick={() => setViewMode("table")}
                        >
                            <LuLayoutList size={15} />
                            Table
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm ${viewMode === "grid" ? "btn-primary" : "btn-outline-primary"} d-flex align-items-center gap-1`}
                            onClick={() => setViewMode("grid")}
                        >
                            <LuLayoutGrid size={15} />
                            Grid
                        </button>
                    </div>
                </div>

                {/* Summary bar */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header py-3 px-4 d-flex align-items-center justify-content-between border-bottom">
                        <h6 className="mb-0 fw-bold text-primary">Summary</h6>
                        <button
                            type="button"
                            className="btn btn-sm btn-icon btn-text-secondary rounded-circle ms-auto"
                            onClick={() => setStatsCollapsed(!statsCollapsed)}
                        >
                            <i className={`bx ${statsCollapsed ? "bx-chevron-down" : "bx-chevron-up"}`} style={{ fontSize: "1.25rem" }} />
                        </button>
                    </div>
                    <div className={`collapse ${statsCollapsed ? "" : "show"}`}>
                        <div className="card-body px-4 pt-5 pb-4">
                            {/* Stats Cards */}
                            <div className="row g-3">
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
                        </div>
                    </div>
                </div>

                {/* ── Table View ─────────────────────────────── */}
                <div style={{ display: viewMode === "table" ? "block" : "none" }}>
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
                </div>

                {/* ── Grid View ──────────────────────────────── */}
                {viewMode === "grid" && (
                    <div className="officer-calendar-wrapper">
                        {/* Grid Header */}
                        <div className="card mb-4">
                            <div className="card-body py-3">
                                <div className="d-flex flex-wrap align-items-center gap-3">
                                    {/* Branch selector */}
                                    <div style={{ minWidth: "220px", flex: "1 1 220px" }}>
                                        <SelectField
                                            id="grid-branch-select"
                                            name="branch_id"
                                            placeholder="Select a branch"
                                            value={gridBranchId}
                                            onChange={(value) => {
                                                setGridBranchId(value);
                                                setGridRoomId("");
                                                setPopoverData(null);
                                            }}
                                            options={branches}
                                            renderOption={(b) => `${b.code} – ${b.name}`}
                                            wrapperClassName="mb-0"
                                        />
                                    </div>

                                    {/* Room selector */}
                                    <div style={{ minWidth: "220px", flex: "1 1 220px" }}>
                                        <SelectField
                                            id="grid-room-select"
                                            name="room_id"
                                            placeholder={gridBranchId ? "Select a room" : "Select a branch first"}
                                            value={gridRoomId}
                                            onChange={(value) => {
                                                setGridRoomId(value);
                                                setPopoverData(null);
                                            }}
                                            options={gridFilteredRooms}
                                            renderOption={(r) =>
                                                `${shortCode(r.code)} – ${r.building_name} (${r.type})`
                                            }
                                            disabled={!gridBranchId}
                                            wrapperClassName="mb-0"
                                        />
                                    </div>

                                    {/* Period selector */}
                                    <div style={{ minWidth: "220px", flex: "1 1 220px" }}>
                                        <SelectField
                                            id="grid-period-select"
                                            name="academic_period_id"
                                            placeholder="Select academic period"
                                            value={gridPeriodId}
                                            onChange={(value) => {
                                                setGridPeriodId(value);
                                                setPopoverData(null);
                                            }}
                                            options={sortedAcademicPeriods}
                                            renderOption={(period) =>
                                                `${formatPeriod(period)}${period.is_current ? " (Current)" : ""}`
                                            }
                                            wrapperClassName="mb-0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        {gridRoom && gridPeriodId ? (
                            <ScheduleCalendarGrid
                                schedules={gridSchedules}
                                loading={gridLoading}
                                onEdit={handleGridEdit}
                                onDelete={handleGridDelete}
                                onEmptyClick={handleEmptyClick}
                                ghostBlock={popoverData}
                                isAdmin={true}
                                calendarRef={calendarRef}
                            />
                        ) : (
                            <div className="officer-calendar-empty">
                                <LuCalendarRange className="empty-icon" />
                                <div className="empty-title">
                                    {!gridRoom ? "Select a Room" : "Select an Academic Period"}
                                </div>
                                <div className="empty-text">
                                    {!gridRoom
                                        ? "Choose a room from the dropdown above to view its weekly schedule."
                                        : "Select an academic period from the dropdown above to view schedules."}
                                </div>
                            </div>
                        )}

                        {/* Admin inline popover */}
                        {popoverData && gridRoom && (
                            <AdminInlineSchedulePopover
                                day={popoverData.day}
                                startTime={popoverData.startTime}
                                endTime={popoverData.endTime}
                                room={gridRoom}
                                branches={branches}
                                departments={departments}
                                subjects={subjects}
                                professors={professors}
                                currentAcademicPeriodId={currentAcademicPeriodId}
                                anchorRect={popoverData.anchorRect}
                                calendarRect={calendarRef.current?.getBoundingClientRect()}
                                onClose={handlePopoverClose}
                                onSaved={handlePopoverSaved}
                            />
                        )}
                    </div>
                )}

                <FilterRoomScheduleOffcanvas
                    filters={filters}
                    setFilters={setFilters}
                    academicPeriods={academicPeriods}
                    branches={branches}
                    departments={departments}
                    subjects={subjects}
                    rooms={rooms}
                    dayOptions={dayOptions}
                    onApply={applyFilters}
                />
            </Base>
        </>
    );
}
