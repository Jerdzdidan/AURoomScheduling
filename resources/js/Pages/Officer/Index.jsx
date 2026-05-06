import { Head, router, usePage } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Base from "@/Layouts/Base";
import SelectField from "@/Components/Input/SelectField";
import { LuDoorOpen, LuCalendarRange, LuTrash2 } from "react-icons/lu";
import { BiSolidEdit } from "react-icons/bi";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const START_HOUR = 7;
const END_HOUR = 21; // 9:00 PM
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 40; // px per 30 minutes
const PX_PER_MINUTE = SLOT_HEIGHT / 30;
const TOP_PADDING_MINUTES = SLOT_MINUTES;
const TOTAL_MINUTES = ((END_HOUR - START_HOUR) * 60) + TOP_PADDING_MINUTES;

const semesterLabels = {
    "1ST": "1st Semester",
    "2ND": "2nd Semester",
    "SUMMER": "SUMMER",
};

// Strip branch code prefix: "BRN-BLD-101" → "BLD-101"
const shortCode = (code) => {
    if (!code) return "";
    const idx = code.indexOf("-");
    return idx !== -1 ? code.substring(idx + 1) : code;
};

const formatTime12 = (timeStr) => {
    if (!timeStr) return "";

    const [h, m] = timeStr.split(":").map(Number);
    const date = new Date();

    date.setHours(h, m, 0, 0);

    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const minutesFromStart = (timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);

    return ((h - START_HOUR) * 60) + m + TOP_PADDING_MINUTES;
};

const getBlockStyle = (startTime, endTime) => {
    const top = minutesFromStart(startTime) * PX_PER_MINUTE;
    const height = (minutesFromStart(endTime) - minutesFromStart(startTime)) * PX_PER_MINUTE;

    return {
        top: `${top}px`,
        height: `${Math.max(height, SLOT_HEIGHT * 0.5)}px`,
    };
};

const totalHeight = TOTAL_MINUTES * PX_PER_MINUTE;

function TimeColumn() {
    const labels = [
        <div
            key="blank-top-row"
            className="officer-calendar-time-label"
            style={{ height: `${SLOT_HEIGHT}px` }}
            aria-hidden="true"
        />,
    ];

    for (let h = START_HOUR; h <= END_HOUR; h++) {
        const date = new Date();

        date.setHours(h, 0, 0, 0);

        labels.push(
            <div
                key={h}
                className="officer-calendar-time-label"
                style={{ height: `${SLOT_HEIGHT * 2}px` }}
            >
                {date.toLocaleTimeString([], { hour: "numeric", hour12: true })}
            </div>,
        );
    }

    return <div className="officer-calendar-time-col-inner">{labels}</div>;
}

function HourLines() {
    const lines = [];

    for (let h = START_HOUR; h <= END_HOUR; h++) {
        const top = (((h - START_HOUR) * 60) + TOP_PADDING_MINUTES) * PX_PER_MINUTE;

        lines.push(
            <div key={`h-${h}`} className="officer-calendar-hour-line" style={{ top: `${top}px` }} />,
        );

        if (h < END_HOUR) {
            lines.push(
                <div
                    key={`hh-${h}`}
                    className="officer-calendar-half-hour-line"
                    style={{ top: `${top + SLOT_MINUTES * PX_PER_MINUTE}px` }}
                />,
            );
        }
    }

    return <>{lines}</>;
}

function ScheduleBlock({ schedule, onEdit, onDelete }) {
    const [showTooltip, setShowTooltip] = useState(false);
    const blockRef = useRef(null);
    const tooltipRef = useRef(null);
    const hoverTimeout = useRef(null);

    const handleMouseEnter = () => {
        if (!schedule.is_own) return;

        hoverTimeout.current = setTimeout(() => setShowTooltip(true), 300);
    };

    const handleMouseLeave = () => {
        clearTimeout(hoverTimeout.current);
        setShowTooltip(false);
    };

    const handleClick = () => {
        if (!schedule.is_own || !schedule.id) return;

        onEdit(schedule.id);
    };

    // Reposition tooltip if it goes off-screen
    useEffect(() => {
        if (!showTooltip || !tooltipRef.current || !blockRef.current) return;

        const tooltip = tooltipRef.current;

        // Position to the right of the block by default
        tooltip.style.left = "calc(100% + 8px)";
        tooltip.style.right = "auto";
        tooltip.style.top = "0";
        tooltip.dataset.side = "right";

        requestAnimationFrame(() => {
            const tipRect = tooltip.getBoundingClientRect();

            // If tooltip goes off right edge, flip to left
            if (tipRect.right > window.innerWidth - 16) {
                tooltip.style.left = "auto";
                tooltip.style.right = "calc(100% + 8px)";
                tooltip.dataset.side = "left";
            }

            // If tooltip goes below viewport, shift up
            if (tipRect.bottom > window.innerHeight - 16) {
                const overflow = tipRect.bottom - window.innerHeight + 16;

                tooltip.style.top = `-${overflow}px`;
            }
        });
    }, [showTooltip]);

    return (
        <div
            ref={blockRef}
            className={`officer-schedule-block ${schedule.is_own ? "own" : "other"}`}
            style={getBlockStyle(schedule.start_time, schedule.end_time)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
        >
            <div className="officer-schedule-block-content">
                {schedule.is_own ? (
                    <>
                        <span className="block-subject">{schedule.subject_code}</span>
                        <span className="block-section">{schedule.section}</span>
                        <span className="block-professor">{schedule.professor_name || "TBA"}</span>
                        <span className="block-time">
                            {formatTime12(schedule.start_time)} – {formatTime12(schedule.end_time)}
                        </span>
                    </>
                ) : (
                    <>
                        <span className="block-dept">{schedule.department_code}</span>
                        <span className="block-dept">{schedule.department_name}</span>
                        <span className="block-time">
                            {formatTime12(schedule.start_time)} – {formatTime12(schedule.end_time)}
                        </span>
                    </>
                )}
            </div>

            {showTooltip && schedule.is_own && (
                <div
                    ref={tooltipRef}
                    className="officer-schedule-tooltip"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="tooltip-title">
                        {schedule.subject_code} – {schedule.subject_name} ({schedule.subject_class_type})
                    </div>

                    <div className="tooltip-row">
                        <span className="tooltip-label">Section</span>
                        <span className="tooltip-value">{schedule.section}</span>
                    </div>

                    <div className="tooltip-row">
                        <span className="tooltip-label">Professor</span>
                        <span className="tooltip-value">{schedule.professor_name || "–"}</span>
                    </div>

                    <div className="tooltip-row">
                        <span className="tooltip-label">Time</span>
                        <span className="tooltip-value">
                            {formatTime12(schedule.start_time)} – {formatTime12(schedule.end_time)}
                        </span>
                    </div>

                    <div className="tooltip-row">
                        <span className="tooltip-label">Created By</span>
                        <span className="tooltip-value">{schedule.created_by_label || "Unknown"}</span>
                    </div>

                    {schedule.notes && (
                        <div className="tooltip-row">
                            <span className="tooltip-label">Notes</span>
                            <span className="tooltip-value">{schedule.notes}</span>
                        </div>
                    )}

                    <div className="tooltip-actions">
                        <button
                            className="btn btn-sm btn-outline-warning"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(schedule.id);
                            }}
                        >
                            <BiSolidEdit size={14} className="me-1" />
                            Edit
                        </button>

                        {schedule.can_delete && (
                            <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(schedule.id, schedule.subject_code, schedule.section);
                                }}
                            >
                                <LuTrash2 size={14} className="me-1" />
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function DayColumn({ day, schedules, onEdit, onDelete }) {
    const daySchedules = useMemo(
        () => schedules.filter((s) => s.day_of_week === day),
        [schedules, day],
    );

    return (
        <div className="officer-calendar-day-col-inner" style={{ height: `${totalHeight}px` }}>
            <HourLines />

            {daySchedules.map((schedule, index) => (
                <ScheduleBlock
                    key={schedule.id ?? `other-${index}`}
                    schedule={schedule}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}

export default function Index() {
    const page = usePage();
    const {
        rooms = [],
        academicPeriods = [],
        currentAcademicPeriodId,
        departmentCode,
        branchCode,
    } = page.props;

    const pageQuery = useMemo(
        () => new URLSearchParams(page.url.split("?")[1] ?? ""),
        [page.url],
    );

    const selectedRoomId = useMemo(
        () => pageQuery.get("room_id"),
        [pageQuery],
    );
    const [selectedPeriodId, setSelectedPeriodId] = useState(
        pageQuery.get("academic_period_id")
            ?? (currentAcademicPeriodId ? String(currentAcademicPeriodId) : ""),
    );
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);

    const selectedRoom = useMemo(
        () => rooms.find((r) => String(r.id) === String(selectedRoomId)),
        [rooms, selectedRoomId],
    );

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

    const formatPeriod = (period) => {
        if (!period) return "Select a period";

        if (period.academic_year && period.semester) {
            return `A.Y. ${period.academic_year} – ${semesterLabels[period.semester] ?? period.semester}`;
        }

        return period.name || "Unknown";
    };

    // Load schedules whenever room or period changes
    const loadSchedules = useCallback(() => {
        if (!selectedRoomId || !selectedPeriodId || !selectedRoom) {
            setSchedules([]);
            return;
        }

        setLoading(true);

        $.get(route("officer.schedules.data"), {
            room_id: selectedRoomId,
            academic_period_id: selectedPeriodId,
        })
            .done((response) => {
                setSchedules(response.schedules ?? []);
            })
            .fail(() => {
                toastr.error("Failed to load schedules.");
                setSchedules([]);
            })
            .always(() => {
                setLoading(false);
            });
    }, [selectedPeriodId, selectedRoom, selectedRoomId]);

    useEffect(() => {
        loadSchedules();
    }, [loadSchedules]);

    const handleEdit = (id) => {
        const returnParams = new URLSearchParams();

        if (selectedRoomId) {
            returnParams.set("room_id", selectedRoomId);
        }

        if (selectedPeriodId) {
            returnParams.set("academic_period_id", selectedPeriodId);
        }

        const returnTo = returnParams.toString()
            ? `${route("officer.index")}?${returnParams.toString()}`
            : route("officer.index");

        router.get(route("officer.schedules.edit", {
            id,
            return_to: returnTo,
        }));
    };

    const handleDelete = (id, subjectCode, section) => {
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
                    url: route("officer.schedules.delete", id),
                    type: "DELETE",
                })
                    .done((res) => {
                        toastr.success(res.message || "Room schedule deleted successfully.");
                        loadSchedules();
                    })
                    .fail((xhr) => {
                        const message = xhr.responseJSON?.message || "Failed to delete room schedule.";

                        toastr.error(message);
                    });
            }
        });
    };

    // No rooms available in the officer's branch
    if (rooms.length === 0) {
        return (
            <>
                <Head title="Schedule" />

                <Base title="Room Schedule">
                    <div className="officer-calendar-empty">
                        <LuDoorOpen className="empty-icon" />
                        <div className="empty-title">No Rooms Available</div>
                        <div className="empty-text">
                            No rooms are registered in your branch yet. Contact your administrator to get started.
                        </div>
                    </div>
                </Base>
            </>
        );
    }

    return (
        <>
            <Head title="Schedule" />

            <Base title="Room Schedule">
                <div className="officer-calendar-wrapper">
                    {/* ── Header Bar ────────────────────────── */}
                    <div className="card mb-4">
                        <div className="card-body py-3">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                <div>
                                    {selectedRoom ? (
                                        <>
                                            <h5 className="room-title mb-1">
                                                <LuDoorOpen size={20} className="me-2" style={{ verticalAlign: "text-bottom" }} />
                                                {shortCode(selectedRoom.code)}
                                                <span className="badge bg-label-secondary ms-2" style={{ fontSize: "0.7rem", verticalAlign: "middle" }}>
                                                    {selectedRoom.type}
                                                </span>
                                                {selectedRoom.is_assigned_to_department && (
                                                    <span className="badge bg-label-primary ms-2" style={{ fontSize: "0.7rem", verticalAlign: "middle" }}>
                                                        Assigned
                                                    </span>
                                                )}
                                            </h5>
                                            <p className="room-subtitle mb-0">
                                                {selectedRoom.building_code} – {selectedRoom.building_name}
                                                {selectedRoom.is_assigned_to_department
                                                    ? (departmentCode ? ` · ${departmentCode}` : " · Assigned to your department")
                                                    : " · Not assigned to your department"}
                                                {branchCode && ` · ${branchCode}`}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <h5 className="room-title mb-1">Select a Room</h5>
                                            <p className="room-subtitle mb-0">Choose a room from the sidebar to view its schedule. Rooms marked Assigned belong to your department.</p>
                                        </>
                                    )}
                                </div>

                                <div style={{ minWidth: "280px" }} className="mb-0 align-self-center officer-period-select">
                                    <SelectField
                                        id="academic-period-select"
                                        name="academic_period_id"
                                        placeholder="Select academic period"
                                        value={selectedPeriodId}
                                        onChange={(value) => setSelectedPeriodId(value)}
                                        options={sortedAcademicPeriods}
                                        renderOption={(period) =>
                                            `${formatPeriod(period)}${period.is_current ? " (Current)" : ""}`
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Calendar Grid ──────────────────────── */}
                    {selectedRoom && selectedPeriodId ? (
                        <div className="officer-calendar" style={{ position: "relative" }}>
                            {/* Day headers */}
                            <div className="officer-calendar-day-header">Time</div>

                            {DAY_SHORT.map((d) => (
                                <div key={d} className="officer-calendar-day-header">{d}</div>
                            ))}

                            {/* Scrollable body */}
                            <div className="officer-calendar-scroll-container">
                                <TimeColumn />

                                {DAYS.map((day) => (
                                    <DayColumn
                                        key={day}
                                        day={day}
                                        schedules={schedules}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>

                            {/* Loading overlay */}
                            {loading && (
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        background: "rgba(255, 255, 255, 0.6)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        zIndex: 20,
                                        borderRadius: "0.75rem",
                                    }}
                                >
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="officer-calendar-empty">
                            <LuCalendarRange className="empty-icon" />
                            <div className="empty-title">
                                {!selectedRoom ? "Select a Room" : "Select an Academic Period"}
                            </div>
                            <div className="empty-text">
                                {!selectedRoom
                                    ? "Choose a room from the sidebar to view its weekly schedule."
                                    : "Select an academic period from the dropdown above to view schedules."}
                            </div>
                        </div>
                    )}
                </div>
            </Base>
        </>
    );
}
