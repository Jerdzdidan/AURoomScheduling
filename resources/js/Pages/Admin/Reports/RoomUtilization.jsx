import { Head, router, usePage } from "@inertiajs/react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Base from "@/Layouts/Base";
import SelectField from "@/Components/Input/SelectField";
import TimeSelectField from "@/Components/Input/TimeSelectField";
import StatsCard from "@/Components/Card/StatsCard";
import { LuBuilding2, LuCalendarCheck, LuDoorOpen, LuSearch, LuX, LuExternalLink } from "react-icons/lu";

/* ─── helpers ─────────────────────────────────────────────── */

const semesterLabels = {
    "1ST": "1st Semester",
    "2ND": "2nd Semester",
    "SUMMER": "Summer",
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

/* ─── sub-components ──────────────────────────────────────── */



function RoomCard({ room, status, onRoomClick }) {
    const isAvailable = status === "available";
    const [open, setOpen] = useState(false);

    const handleCardClick = () => {
        if (room.schedules?.length) {
            setOpen((p) => !p);
        }
    };

    const handleGridClick = (e) => {
        e.stopPropagation();
        if (onRoomClick) {
            onRoomClick(room);
        }
    };

    return (
        <div
            className="card border-0 shadow-sm h-100"
            style={{
                borderLeft: `4px solid ${isAvailable ? "#28a745" : "#dc3545"}`,
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                cursor: room.schedules?.length ? "pointer" : "default",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "";
            }}
            onClick={handleCardClick}
        >
            <div className="card-body py-3 px-3">
                <div className="d-flex justify-content-between align-items-start gap-2">
                    <div className="min-w-0">
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <LuDoorOpen size={15} style={{ color: isAvailable ? "#28a745" : "#dc3545", flexShrink: 0 }} />
                            <span className="fw-bold text-truncate" style={{ fontSize: "0.9rem" }}>
                                {shortCode(room.code)}
                            </span>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                            <LuBuilding2 size={12} className="text-muted" style={{ flexShrink: 0 }} />
                            <small className="text-muted text-truncate">{room.building_code} – {room.building_name}</small>
                        </div>
                    </div>
                    <div className="d-flex flex-column align-items-end gap-1 flex-shrink-0">
                        <span className={`badge ${isAvailable ? "bg-success" : "bg-danger"}`}
                            style={{ fontSize: "0.65rem" }}>
                            {isAvailable ? "Available" : "Busy"}
                        </span>
                        <span className="badge bg-label-secondary" style={{ fontSize: "0.62rem" }}>{room.type}</span>
                    </div>
                </div>

                {/* Click hint */}
                {onRoomClick && (
                    <div className="mt-2 pt-1 border-top">
                        <button
                            type="button"
                            className="btn btn-link text-primary p-0 d-flex align-items-center gap-1 text-decoration-none"
                            style={{ fontSize: "0.72rem" }}
                            onClick={handleGridClick}
                        >
                            <LuExternalLink size={11} />
                            View full schedule
                        </button>
                    </div>
                )}

                {/* Busy: show schedule(s) */}
                {!isAvailable && room.schedules?.length > 0 && open && (
                    <div className="mt-2 pt-2 border-top">
                        {room.schedules.map((s, i) => (
                            <div key={i} className={`p-2 rounded ${i > 0 ? "mt-1" : ""}`}
                                style={{ background: "rgba(220,53,69,0.06)", fontSize: "0.75rem" }}>
                                <div className="fw-semibold text-danger">{s.department_name}</div>
                                <div className="fw-semibold text-danger">{s.subject_code} – {s.section}</div>
                                <div className="text-muted">{s.subject_name} <span className="badge bg-label-danger ms-1" style={{ fontSize: "0.6rem" }}>{s.subject_class_type}</span></div>
                                <div className="text-muted mt-1">
                                    <i className="bx bx-user me-1" />
                                    {s.professor_name}
                                </div>
                                <div className="text-muted mt-1">
                                    <i className="bx bx-time me-1" />
                                    {formatTime(s.start_time)} – {formatTime(s.end_time)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {!isAvailable && room.schedules?.length > 0 && !open && (
                    <div className="mt-2 pt-1">
                        <small className="text-danger" style={{ fontSize: "0.72rem" }}>
                            <i className="bx bx-info-circle me-1" />
                            {room.schedules.length} schedule{room.schedules.length > 1 ? "s" : ""} – click to view
                        </small>
                    </div>
                )}
            </div>
        </div>
    );
}

function BuildingGroup({ buildingCode, buildingName, rooms, status, onRoomClick }) {
    return (
        <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-2">
                <LuBuilding2 size={14} className="text-muted" />
                <span className="fw-semibold text-secondary" style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {buildingCode} – {buildingName}
                </span>
                <span className="badge bg-label-secondary ms-1" style={{ fontSize: "0.65rem" }}>{rooms.length}</span>
            </div>
            <div className="row g-2">
                {rooms.map((room) => (
                    <div key={room.id} className="col-sm-6 col-lg-4 col-xl-3">
                        <RoomCard room={room} status={status} onRoomClick={onRoomClick} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function RoomSection({ title, rooms, status, emptyText, onRoomClick }) {
    const [collapsed, setCollapsed] = useState(false);
    const grouped = useMemo(() => {
        const map = new Map();
        rooms.forEach((r) => {
            const key = r.building_id;
            if (!map.has(key)) {
                map.set(key, {
                    building_id: r.building_id,
                    building_name: r.building_name,
                    building_code: r.building_code,
                    rooms: [],
                });
            }
            map.get(key).rooms.push(r);
        });
        return [...map.values()];
    }, [rooms]);

    const accentColor = status === "available" ? "#28a745" : "#dc3545";

    return (
        <div className="card border-0 shadow-sm mb-4">
            <div className="card-header border-bottom py-3 px-4 d-flex align-items-center gap-2"
                style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.02) 0%, #fff 100%)" }}>
                <span
                    className="rounded-circle d-inline-flex align-items-center justify-content-center"
                    style={{ width: 28, height: 28, background: `${accentColor}20`, color: accentColor, flexShrink: 0 }}
                >
                    {status === "available"
                        ? <LuCalendarCheck size={14} />
                        : <LuX size={14} />}
                </span>
                <h6 className="mb-0 fw-bold">{title}</h6>
                <span className={`badge ms-auto`} style={{ background: accentColor, fontSize: "0.7rem" }}>
                    {rooms.length} room{rooms.length !== 1 ? "s" : ""}
                </span>
                <button
                    type="button"
                    className="btn btn-sm btn-icon btn-text-secondary rounded-circle ms-2"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <i className={`bx ${collapsed ? "bx-chevron-down" : "bx-chevron-up"}`} style={{ fontSize: "1.25rem" }} />
                </button>
            </div>
            <div className={`collapse ${collapsed ? "" : "show"}`}>
                <div className="card-body px-4 pt-3 pb-2">
                {rooms.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                        <LuDoorOpen size={32} className="mb-2 opacity-50" />
                        <div style={{ fontSize: "0.875rem" }}>{emptyText}</div>
                    </div>
                ) : (
                    grouped.map((group) => (
                        <BuildingGroup
                            key={group.building_id}
                            buildingCode={group.building_code}
                            buildingName={group.building_name}
                            rooms={group.rooms}
                            status={status}
                            onRoomClick={onRoomClick}
                        />
                    ))
                )}
                </div>
            </div>
        </div>
    );
}

/* ─── main page ───────────────────────────────────────────── */

const getInitialFilters = () => ({
    academic_period_id: "",
    branch_id: "",
    building_id: "",
    day_of_week: "",
    start_time: "",
    end_time: "",
});

export default function RoomUtilization() {
    const page = usePage();
    const {
        academicPeriods = [],
        branches = [],
        buildings = [],
        dayOptions = [],
        currentAcademicPeriodId = null,
        initialFilters = {},
    } = page.props;

    const [filters, setFilters] = useState(() => ({
        ...getInitialFilters(),
        academic_period_id: initialFilters.academic_period_id || currentAcademicPeriodId?.toString() || "",
        branch_id: initialFilters.branch_id || "",
        building_id: initialFilters.building_id || "",
        day_of_week: initialFilters.day_of_week || "",
        start_time: initialFilters.start_time || "",
        end_time: initialFilters.end_time || "",
    }));
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [searched, setSearched] = useState(false);
    const [searchCollapsed, setSearchCollapsed] = useState(false);
    const [statsCollapsed, setStatsCollapsed] = useState(false);

    const filteredBuildings = useMemo(() => {
        if (!filters.branch_id) return [];
        return buildings.filter(
            (b) => b.branch_id?.toString() === filters.branch_id?.toString()
        );
    }, [buildings, filters.branch_id]);

    const academicPeriodOptions = useMemo(() =>
        academicPeriods.map((p) => ({
            ...p,
            _display: `A.Y. ${p.academic_year} – ${semesterLabels[p.semester] ?? p.semester}${p.is_current ? " (Current)" : ""}`,
        })),
        [academicPeriods]
    );

    const validate = useCallback(() => {
        const errs = {};
        if (!filters.academic_period_id) errs.academic_period_id = "Select an academic period.";
        if (!filters.branch_id) errs.branch_id = "Select a branch.";
        if (!filters.day_of_week) errs.day_of_week = "Select a day.";
        if (!filters.start_time) errs.start_time = "Select a start time.";
        if (!filters.end_time) errs.end_time = "Select an end time.";
        if (filters.start_time && filters.end_time && filters.end_time <= filters.start_time) {
            errs.end_time = "End time must be later than start time.";
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }, [filters]);

    const handleSearch = useCallback(() => {
        if (!validate()) {
            return;
        }

        setLoading(true);
        setResult(null);
        setSearched(true);

        $.get(route("admin.reports.room-utilization.search"), {
            academic_period_id: filters.academic_period_id,
            branch_id: filters.branch_id,
            building_id: filters.building_id || undefined,
            day_of_week: filters.day_of_week,
            start_time: filters.start_time,
            end_time: filters.end_time,
        })
            .done((res) => setResult(res))
            .fail((xhr) => {
                const errsFromServer = xhr.responseJSON?.errors ?? {};
                setErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(errsFromServer).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])) }));
                toastr.error(xhr.responseJSON?.message || "Search failed. Please check the fields and try again.");
                setSearched(false);
            })
            .always(() => setLoading(false));
    }, [filters, validate]);

    const autoSearchDone = useRef(false);

    useEffect(() => {
        if (!autoSearchDone.current && filters.academic_period_id && filters.branch_id && filters.day_of_week && filters.start_time && filters.end_time) {
            autoSearchDone.current = true;
            handleSearch();
        }
    }, [filters, handleSearch]);

    const handleReset = () => {
        setFilters({ ...getInitialFilters(), academic_period_id: currentAcademicPeriodId?.toString() ?? "" });
        setErrors({});
        setResult(null);
        setSearched(false);
    };

    const utilizationPct = result
        ? result.total_rooms === 0 ? 0 : Math.round((result.busy_count / result.total_rooms) * 100)
        : 0;

    const handleRoomClick = (room) => {
        router.post(route("admin.reports.room-utilization.grid.open"), {
            room_id: room.id,
            academic_period_id: filters.academic_period_id,
            branch_id: filters.branch_id,
            building_id: filters.building_id || null,
            day_of_week: filters.day_of_week,
            start_time: filters.start_time,
            end_time: filters.end_time,
        }, {
            onError: () => {
                toastr.error("Unable to open the room grid. Please refresh and try again.");
            },
        });
    };

    return (
        <>
            <Head title="Reports > Room Utilization" />

            <Base title="Reports > Room Utilization">

                {/* ── Search Panel ─────────────────────────── */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header border-bottom py-3 px-4">
                        <div className="d-flex align-items-center gap-2">
                            <LuSearch size={18} className="text-primary" />
                            <h6 className="mb-0 fw-bold">Search Parameters</h6>
                            <button
                                type="button"
                                className="btn btn-sm btn-icon btn-text-secondary rounded-circle ms-auto"
                                onClick={() => setSearchCollapsed(!searchCollapsed)}
                            >
                                <i className={`bx ${searchCollapsed ? "bx-chevron-down" : "bx-chevron-up"}`} style={{ fontSize: "1.25rem" }} />
                            </button>
                        </div>
                        <p className="text-muted mb-0 mt-1" style={{ fontSize: "0.82rem" }}>
                            Select an academic period, branch, day, and time window to see room availability.
                        </p>
                    </div>

                    <div className={`collapse ${searchCollapsed ? "" : "show"}`}>
                        <div className="card-body px-4 pt-3">
                        <div className="row g-3">
                            {/* Academic Period */}
                            <div className="col-lg-4 col-md-6">
                                <SelectField
                                    id="ru-academic-period"
                                    label="Academic Period"
                                    name="academic_period_id"
                                    placeholder="Select academic period"
                                    value={filters.academic_period_id}
                                    onChange={(v) => {
                                        setFilters((c) => ({ ...c, academic_period_id: v }));
                                        setErrors((c) => ({ ...c, academic_period_id: "" }));
                                    }}
                                    options={academicPeriodOptions}
                                    renderOption={(p) => p._display}
                                    error={errors.academic_period_id}
                                    required
                                />
                            </div>

                            {/* Branch */}
                            <div className="col-lg-4 col-md-6">
                                <SelectField
                                    id="ru-branch"
                                    label="Branch"
                                    name="branch_id"
                                    placeholder="Select a branch"
                                    value={filters.branch_id}
                                    onChange={(v) => {
                                        setFilters((c) => ({ ...c, branch_id: v, building_id: "" }));
                                        setErrors((c) => ({ ...c, branch_id: "" }));
                                    }}
                                    options={branches}
                                    error={errors.branch_id}
                                    required
                                />
                            </div>

                            {/* Building (optional) */}
                            <div className="col-lg-4 col-md-6">
                                <SelectField
                                    id="ru-building"
                                    label="Building (optional)"
                                    name="building_id"
                                    placeholder={filters.branch_id ? "All buildings" : "Select a branch first"}
                                    value={filters.building_id}
                                    onChange={(v) => setFilters((c) => ({ ...c, building_id: v }))}
                                    options={filteredBuildings}
                                    renderOption={(b) => `${b.code} – ${b.name}`}
                                    disabled={!filters.branch_id}
                                />
                            </div>

                            {/* Day */}
                            <div className="col-lg-4 col-md-6">
                                <SelectField
                                    id="ru-day"
                                    label="Day"
                                    name="day_of_week"
                                    placeholder="Select a day"
                                    value={filters.day_of_week}
                                    onChange={(v) => {
                                        setFilters((c) => ({ ...c, day_of_week: v }));
                                        setErrors((c) => ({ ...c, day_of_week: "" }));
                                    }}
                                    options={dayOptions}
                                    error={errors.day_of_week}
                                    required
                                />
                            </div>

                            {/* Start Time */}
                            <div className="col-lg-4 col-md-6">
                                <TimeSelectField
                                    id="ru-start-time"
                                    label="Start Time"
                                    name="start_time"
                                    value={filters.start_time}
                                    onChange={(v) => {
                                        setFilters((c) => ({ ...c, start_time: v }));
                                        setErrors((c) => ({ ...c, start_time: "", end_time: "" }));
                                    }}
                                    error={errors.start_time}
                                    help="7:30 AM – 8:30 PM"
                                    required
                                />
                            </div>

                            {/* End Time */}
                            <div className="col-lg-4 col-md-6">
                                <TimeSelectField
                                    id="ru-end-time"
                                    label="End Time"
                                    name="end_time"
                                    value={filters.end_time}
                                    onChange={(v) => {
                                        setFilters((c) => ({ ...c, end_time: v }));
                                        setErrors((c) => ({ ...c, end_time: "" }));
                                    }}
                                    error={errors.end_time}
                                    help="7:30 AM – 8:30 PM"
                                    required
                                />
                            </div>
                        </div>

                        <div className="d-flex gap-2 mt-2 mb-1">
                            <button
                                type="button"
                                className="btn btn-primary d-flex align-items-center gap-2"
                                onClick={handleSearch}
                                disabled={loading}
                            >
                                {loading
                                    ? <><span className="spinner-border spinner-border-sm" role="status" /><span>Searching...</span></>
                                    : <><LuSearch size={16} /><span>Search Availability</span></>
                                }
                            </button>
                            {searched && (
                                <button
                                    type="button"
                                    className="btn btn-label-secondary d-flex align-items-center gap-2"
                                    onClick={handleReset}
                                >
                                    <LuX size={15} />
                                    <span>Reset</span>
                                </button>
                            )}
                        </div>
                        </div>
                    </div>
                </div>

                {/* ── Results ───────────────────────────────── */}
                {result && (
                    <>
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
                                <div className="card-body px-4 py-3">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                    <div>
                                        <h6 className="mb-1 fw-bold text-primary">
                                            {result.academic_period} &mdash; {result.day_label}
                                        </h6>
                                        <p className="mb-0 text-muted" style={{ fontSize: "0.82rem" }}>
                                            Time window: <strong>{formatTime(result.start_time)}</strong> – <strong>{formatTime(result.end_time)}</strong>
                                            &nbsp;·&nbsp; {result.total_rooms} room{result.total_rooms !== 1 ? "s" : ""} scanned
                                        </p>
                                    </div>

                                    {/* Utilization bar */}
                                    <div style={{ minWidth: 220 }}>
                                        <div className="d-flex justify-content-between mb-1">
                                            <small className="text-muted fw-semibold">Room Utilization</small>
                                            <small className="fw-bold" style={{ color: utilizationPct > 70 ? "#dc3545" : utilizationPct > 40 ? "#fd7e14" : "#28a745" }}>
                                                {utilizationPct}%
                                            </small>
                                        </div>
                                        <div className="progress" style={{ height: 8, borderRadius: 8 }}>
                                            <div
                                                className="progress-bar"
                                                style={{
                                                    width: `${utilizationPct}%`,
                                                    background: utilizationPct > 70 ? "#dc3545" : utilizationPct > 40 ? "#fd7e14" : "#28a745",
                                                    borderRadius: 8,
                                                    transition: "width 0.6s ease",
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Stat cards */}
                                <div className="row g-3 mt-1">
                                    <StatsCard
                                        id="total-rooms"
                                        title="Total Rooms"
                                        Icon={LuDoorOpen}
                                        iconSize="28"
                                        bgColor="bg-primary"
                                        className="col-sm-4"
                                        value={result.total_rooms}
                                    />
                                    <StatsCard
                                        id="available-rooms"
                                        title="Available"
                                        Icon={LuCalendarCheck}
                                        iconSize="28"
                                        bgColor="bg-success"
                                        className="col-sm-4"
                                        value={result.available_count}
                                    />
                                    <StatsCard
                                        id="occupied-rooms"
                                        title="Occupied"
                                        Icon={LuX}
                                        iconSize="28"
                                        bgColor="bg-danger"
                                        className="col-sm-4"
                                        value={result.busy_count}
                                    />
                                </div>
                            </div>
                            </div>
                        </div>

                        {/* Available Rooms */}
                        <RoomSection
                            title="Available Rooms"
                            rooms={result.available}
                            status="available"
                            emptyText="No available rooms for the selected time window."
                            onRoomClick={handleRoomClick}
                        />

                        {/* Occupied Rooms */}
                        <RoomSection
                            title="Occupied Rooms"
                            rooms={result.busy}
                            status="busy"
                            emptyText="No occupied rooms for the selected time window."
                            onRoomClick={handleRoomClick}
                        />
                    </>
                )}

                {/* Empty state before first search */}
                {!result && !loading && !searched && (
                    <div className="card border-0 shadow-sm">
                        <div className="card-body text-center py-5">
                            <LuCalendarCheck size={48} className="text-muted mb-3 opacity-50" />
                            <h6 className="text-muted fw-semibold">No Results Yet</h6>
                            <p className="text-muted mb-0" style={{ fontSize: "0.875rem" }}>
                                Fill in the search parameters above and click <strong>Search Availability</strong> to see which rooms are free.
                            </p>
                        </div>
                    </div>
                )}
            </Base>
        </>
    );
}
