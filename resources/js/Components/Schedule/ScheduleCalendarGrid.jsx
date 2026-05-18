import { useEffect, useMemo, useRef, useState } from "react";
import { LuTrash2, LuCalendarRange, LuArrowRightLeft, LuUndo2, LuFlag } from "react-icons/lu";
import { BiSolidEdit } from "react-icons/bi";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const START_HOUR = 7;
const END_HOUR = 21;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 40;
const PX_PER_MINUTE = SLOT_HEIGHT / 30;
const TOP_PADDING_MINUTES = SLOT_MINUTES;
const TOTAL_MINUTES = ((END_HOUR - START_HOUR) * 60) + TOP_PADDING_MINUTES;
const DEFAULT_NEW_BLOCK_MINUTES = 60;
const EARLIEST_CLICKABLE_MINUTES = 30; // 7:30 AM
const LATEST_SCHEDULE_END_MINUTES = ((20 - START_HOUR) * 60) + 30; // 8:30 PM

export const formatTime12 = (timeStr) => {
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

/**
 * A single schedule block rendered inside a day column.
 *
 * @param {boolean} isAdmin - When true, all blocks show full details and use any supplied actions.
 */
function ScheduleBlock({ schedule, onEdit, onDelete, onMarkToTransfer, onRevertTransfer, onExecuteTransfer, isAdmin }) {
    const [showTooltip, setShowTooltip] = useState(false);
    const blockRef = useRef(null);
    const tooltipRef = useRef(null);
    const hoverTimeout = useRef(null);

    const isToTransfer = schedule.transfer_status === "TO_TRANSFER";
    const canViewDetails = isAdmin || schedule.is_own;
    const canEdit = canViewDetails && typeof onEdit === "function" && Boolean(schedule.id) && !isToTransfer;
    const canDelete = typeof onDelete === "function" && (isAdmin || schedule.can_delete);
    const canMarkTransfer = isAdmin && !isToTransfer && typeof onMarkToTransfer === "function" && Boolean(schedule.id);
    const canRevert = isAdmin && isToTransfer && typeof onRevertTransfer === "function" && Boolean(schedule.id);
    const canTransfer = isAdmin && isToTransfer && typeof onExecuteTransfer === "function" && Boolean(schedule.id);
    const hasActions = canEdit || canDelete || canMarkTransfer || canRevert || canTransfer;

    const handleMouseEnter = () => {
        // Officers can't interact with TO_TRANSFER blocks
        if (!isAdmin && isToTransfer) return;
        if (!canViewDetails) return;

        hoverTimeout.current = setTimeout(() => setShowTooltip(true), 300);
    };

    const handleMouseLeave = () => {
        clearTimeout(hoverTimeout.current);
        setShowTooltip(false);
    };

    const handleClick = () => {
        if (!canEdit) return;

        onEdit(schedule.id);
    };

    // Reposition tooltip if it goes off-screen
    useEffect(() => {
        if (!showTooltip || !tooltipRef.current || !blockRef.current) return;

        const tooltip = tooltipRef.current;

        tooltip.style.left = "calc(100% + 8px)";
        tooltip.style.right = "auto";
        tooltip.style.top = "0";
        tooltip.dataset.side = "right";

        requestAnimationFrame(() => {
            const tipRect = tooltip.getBoundingClientRect();

            if (tipRect.right > window.innerWidth - 16) {
                tooltip.style.left = "auto";
                tooltip.style.right = "calc(100% + 8px)";
                tooltip.dataset.side = "left";
            }

            if (tipRect.bottom > window.innerHeight - 16) {
                const overflow = tipRect.bottom - window.innerHeight + 16;

                tooltip.style.top = `-${overflow}px`;
            }
        });
    }, [showTooltip]);

    // Determine block content display
    const showFull = canViewDetails;
    const durationMinutes = Math.max(
        0,
        minutesFromStart(schedule.end_time) - minutesFromStart(schedule.start_time),
    );
    const isUltraCompactAdminBlock = isAdmin && showFull && durationMinutes < SLOT_MINUTES;
    const isCompactAdminBlock = isAdmin && showFull && durationMinutes === SLOT_MINUTES;
    const departmentDisplay = [schedule.department_code, schedule.department_name]
        .filter(Boolean)
        .join(" – ");
    const subjectDisplay = [schedule.subject_code, schedule.subject_name]
        .filter(Boolean)
        .join(" – ");
    const subjectDisplayWithType = schedule.subject_class_type
        ? `${subjectDisplay} (${schedule.subject_class_type})`
        : subjectDisplay;

    const blockClass = isToTransfer
        ? `officer-schedule-block to-transfer${isCompactAdminBlock ? " compact-admin" : ""}${isUltraCompactAdminBlock ? " ultra-compact-admin" : ""}`
        : `officer-schedule-block ${showFull ? "own" : "other"}${isCompactAdminBlock ? " compact-admin" : ""}${isUltraCompactAdminBlock ? " ultra-compact-admin" : ""}`;

    return (
        <div
            ref={blockRef}
            className={blockClass}
            style={getBlockStyle(schedule.start_time, schedule.end_time)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
        >
            <div className="officer-schedule-block-content">
                {isUltraCompactAdminBlock ? (
                    <>
                        <span className="block-dept">{schedule.department_code || schedule.department_name || "—"}</span>
                    </>
                ) : isCompactAdminBlock ? (
                    <>
                        <span className="block-dept">{schedule.department_code || schedule.department_name || "—"}</span>
                        <span className="block-time">
                            {formatTime12(schedule.start_time)} – {formatTime12(schedule.end_time)}
                        </span>
                    </>
                ) : showFull && isAdmin ? (
                    <>
                        <span className="block-dept">{schedule.department_code || schedule.department_name || "—"}</span>
                        <span className="block-subject">
                            {[schedule.subject_code, schedule.section].filter(Boolean).join(" · ")}
                        </span>
                        <span className="block-professor">{schedule.professor_name || "TBA"}</span>
                        <span className="block-time">
                            {formatTime12(schedule.start_time)} – {formatTime12(schedule.end_time)}
                        </span>
                    </>
                ) : showFull ? (
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

            {showTooltip && canViewDetails && (
                <div
                    ref={tooltipRef}
                    className={`officer-schedule-tooltip${isToTransfer ? " to-transfer-tooltip" : ""}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {isToTransfer && (
                        <div className="mb-1">
                            <span className="badge badge-to-transfer">To Transfer</span>
                        </div>
                    )}
                    <div className="tooltip-title">
                        {isAdmin && departmentDisplay
                            ? departmentDisplay
                            : `${schedule.subject_code} – ${schedule.subject_name} (${schedule.subject_class_type})`}
                    </div>

                    {isAdmin && subjectDisplayWithType && (
                        <div className="tooltip-row">
                            <span className="tooltip-label">Subject</span>
                            <span className="tooltip-value">{subjectDisplayWithType}</span>
                        </div>
                    )}

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

                    {schedule.department_name && !isAdmin && (
                        <div className="tooltip-row">
                            <span className="tooltip-label">Department</span>
                            <span className="tooltip-value">{schedule.department_code} – {schedule.department_name}</span>
                        </div>
                    )}

                    {schedule.created_by_label && (
                        <div className="tooltip-row">
                            <span className="tooltip-label">Created By</span>
                            <span className="tooltip-value">{schedule.created_by_label}</span>
                        </div>
                    )}

                    {schedule.notes && (
                        <div className="tooltip-row">
                            <span className="tooltip-label">Notes</span>
                            <span className="tooltip-value">{schedule.notes}</span>
                        </div>
                    )}

                    {hasActions && (
                        <div className="tooltip-actions">
                            {canMarkTransfer && (
                                <button
                                    className="btn btn-sm btn-outline-danger"
                                    title="Mark as To Transfer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMarkToTransfer(schedule.id, schedule.subject_code, schedule.section);
                                    }}
                                >
                                    <LuFlag size={14} />
                                </button>
                            )}

                            {canEdit && (
                                <button
                                    className="btn btn-sm btn-outline-warning"
                                    title="Edit"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(schedule.id);
                                    }}
                                >
                                    <BiSolidEdit size={14} />
                                </button>
                            )}

                            {canTransfer && (
                                <button
                                    className="btn btn-sm btn-danger"
                                    title="Transfer to another room"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onExecuteTransfer(schedule.id, schedule.subject_code, schedule.section);
                                    }}
                                >
                                    <LuArrowRightLeft size={14} />
                                </button>
                            )}

                            {canRevert && (
                                <button
                                    className="btn btn-sm btn-outline-secondary"
                                    title="Revert transfer status"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRevertTransfer(schedule.id, schedule.subject_code, schedule.section);
                                    }}
                                >
                                    <LuUndo2 size={14} />
                                </button>
                            )}

                            {canDelete && (
                                <button
                                    className="btn btn-sm btn-outline-danger"
                                    title="Delete"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(schedule.id, schedule.subject_code, schedule.section);
                                    }}
                                >
                                    <LuTrash2 size={14} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function DayColumn({ day, schedules, onEdit, onDelete, onMarkToTransfer, onRevertTransfer, onExecuteTransfer, onEmptyClick, ghostBlock, isAdmin }) {
    const daySchedules = useMemo(
        () => schedules.filter((s) => s.day_of_week === day),
        [schedules, day],
    );

    const handleClick = (e) => {
        if (e.target !== e.currentTarget && !e.target.classList.contains("officer-calendar-hour-line") && !e.target.classList.contains("officer-calendar-half-hour-line")) {
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const clickY = e.clientY - rect.top;

        const rawMinutes = (clickY / PX_PER_MINUTE) - TOP_PADDING_MINUTES;
        const snappedMinutes = Math.floor(rawMinutes / SLOT_MINUTES) * SLOT_MINUTES;

        if (snappedMinutes < EARLIEST_CLICKABLE_MINUTES) return;
        if ((snappedMinutes + DEFAULT_NEW_BLOCK_MINUTES) > LATEST_SCHEDULE_END_MINUTES) return;

        const startH = START_HOUR + Math.floor(snappedMinutes / 60);
        const startM = snappedMinutes % 60;
        const endTotalMinutes = snappedMinutes + DEFAULT_NEW_BLOCK_MINUTES;
        const endH = START_HOUR + Math.floor(endTotalMinutes / 60);
        const endM = endTotalMinutes % 60;

        const startTime = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
        const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

        const anchorRect = {
            top: e.clientY - 20,
            bottom: e.clientY + 20,
            left: rect.left,
            right: rect.right,
        };

        onEmptyClick?.({ day, startTime, endTime, anchorRect });
    };

    return (
        <div
            className="officer-calendar-day-col-inner"
            style={{ height: `${totalHeight}px` }}
            onClick={handleClick}
        >
            <HourLines />

            {ghostBlock && ghostBlock.day === day && (
                <div
                    className="officer-ghost-block"
                    style={getBlockStyle(ghostBlock.startTime, ghostBlock.endTime)}
                >
                    <span>New Schedule</span>
                </div>
            )}

            {daySchedules.map((schedule, index) => (
                <ScheduleBlock
                    key={schedule.id ?? `other-${index}`}
                    schedule={schedule}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onMarkToTransfer={onMarkToTransfer}
                    onRevertTransfer={onRevertTransfer}
                    onExecuteTransfer={onExecuteTransfer}
                    isAdmin={isAdmin}
                />
            ))}
        </div>
    );
}

/**
 * Shared calendar grid component used by both Officer and Admin views.
 *
 * @param {Array}    schedules     - Schedule records for the selected room + period
 * @param {boolean}  loading       - Whether schedules are currently loading
 * @param {Function} onEdit        - Called with schedule id when edit is triggered
 * @param {Function} onDelete      - Called with (id, subjectCode, section) for deletion
 * @param {Function} onEmptyClick  - Called with { day, startTime, endTime, anchorRect }
 * @param {Object}   ghostBlock    - Current popover data for ghost block preview (or null)
 * @param {boolean}  isAdmin       - Admin mode (all blocks fully visible & editable)
 * @param {React.Ref} calendarRef  - Ref attached to the calendar wrapper
 */
export default function ScheduleCalendarGrid({
    schedules = [],
    loading = false,
    onEdit,
    onDelete,
    onMarkToTransfer,
    onRevertTransfer,
    onExecuteTransfer,
    onEmptyClick,
    ghostBlock = null,
    isAdmin = false,
    calendarRef,
}) {
    return (
        <div ref={calendarRef} className="officer-calendar" style={{ position: "relative" }}>
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
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onMarkToTransfer={onMarkToTransfer}
                        onRevertTransfer={onRevertTransfer}
                        onExecuteTransfer={onExecuteTransfer}
                        onEmptyClick={onEmptyClick}
                        ghostBlock={ghostBlock}
                        isAdmin={isAdmin}
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
    );
}

export { DAYS, DAY_SHORT, START_HOUR, END_HOUR };
