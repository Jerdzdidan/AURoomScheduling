import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePage } from "@inertiajs/react";
import DayRecurrenceSelector from "@/Components/Input/DayRecurrenceSelector";
import SelectField from "@/Components/Input/SelectField";
import TimeSelectField from "@/Components/Input/TimeSelectField";
import { LuX, LuClock, LuDoorOpen, LuCalendarDays } from "react-icons/lu";

const DAY_LABELS = {
    MONDAY: "Monday",
    TUESDAY: "Tuesday",
    WEDNESDAY: "Wednesday",
    THURSDAY: "Thursday",
    FRIDAY: "Friday",
    SATURDAY: "Saturday",
    SUNDAY: "Sunday",
};

const formatTime12 = (timeStr) => {
    if (!timeStr) return "";

    const [h, m] = timeStr.split(":").map(Number);
    const date = new Date();

    date.setHours(h, m, 0, 0);

    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};



// Strip branch code prefix
const shortCode = (code) => {
    if (!code) return "";
    const idx = code.indexOf("-");
    return idx !== -1 ? code.substring(idx + 1) : code;
};

export default function InlineSchedulePopover({
    day,
    startTime,
    endTime,
    room,
    subjects,
    professors,
    currentAcademicPeriodId,
    anchorRect,
    calendarRect,
    onClose,
    onSaved,
}) {
    const popoverRef = useRef(null);

    // Form state
    const [subjectId, setSubjectId] = useState("");
    const [section, setSection] = useState("");
    const [professorId, setProfessorId] = useState("");
    const [formStartTime, setFormStartTime] = useState(startTime);
    const [formEndTime, setFormEndTime] = useState(endTime);
    const [selectedDays, setSelectedDays] = useState([day]);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [conflictMessages, setConflictMessages] = useState({});

    // Position popover
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (!popoverRef.current || !anchorRect || !calendarRect) return;

        const popover = popoverRef.current;

        requestAnimationFrame(() => {
            const popoverRect = popover.getBoundingClientRect();
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;

            // Try right of the click first
            let left = anchorRect.right + 12;
            let top = anchorRect.top;

            // Flip to left if it overflows
            if (left + popoverRect.width > viewportW - 16) {
                left = anchorRect.left - popoverRect.width - 12;
            }

            // Ensure it doesn't go below viewport
            if (top + popoverRect.height > viewportH - 16) {
                top = viewportH - popoverRect.height - 16;
            }

            // Ensure it doesn't go above viewport
            if (top < 16) {
                top = 16;
            }

            // Ensure it doesn't go off the left
            if (left < 16) {
                left = 16;
            }

            setPosition({ top, left });
        });
    }, [anchorRect, calendarRect]);

    // Dismiss on Escape
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKey);

        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    const validate = () => {
        const newErrors = {};

        if (!subjectId) newErrors.subject_id = "Select a subject.";
        if (!section.trim()) newErrors.section = "Enter a section.";
        if (!professorId) newErrors.professor_id = "Select a professor.";
        if (!formStartTime) newErrors.start_time = "Select start time.";
        if (!formEndTime) newErrors.end_time = "Select end time.";
        if (formStartTime && formEndTime && formEndTime <= formStartTime) {
            newErrors.end_time = "End time must be after start time.";
        }
        if (selectedDays.length === 0) newErrors.days = "Select at least one day.";

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;

        setSaving(true);
        setConflictMessages({});

        $.ajax({
            url: route("officer.schedules.ajax-store"),
            type: "POST",
            data: {
                academic_period_id: currentAcademicPeriodId,
                subject_id: subjectId,
                room_id: room.id,
                section: section.trim().toUpperCase(),
                days_of_week: selectedDays,
                start_time: formStartTime,
                end_time: formEndTime,
                professor_id: professorId,
                notes: notes.trim() || null,
            },
        })
            .done((response) => {
                toastr.success(response.message || "Schedule created successfully.");
                onSaved();
            })
            .fail((xhr) => {
                const data = xhr.responseJSON || {};

                if (data.conflicts) {
                    setConflictMessages(data.conflicts);
                    toastr.error(data.message || "Conflicts found.");
                } else if (data.errors) {
                    // Laravel validation errors
                    const mapped = {};

                    Object.entries(data.errors).forEach(([key, messages]) => {
                        mapped[key] = Array.isArray(messages) ? messages[0] : messages;
                    });

                    setErrors(mapped);
                    toastr.error("Please fix the errors and try again.");
                } else {
                    toastr.error(data.message || "Failed to create schedule.");
                }
            })
            .always(() => {
                setSaving(false);
            });
    };

    return (
        <>
            {/* Backdrop */}
            <div className="officer-popover-backdrop" onClick={onClose} />

            {/* Popover */}
            <div
                ref={popoverRef}
                className="officer-inline-popover"
                style={{
                    position: "fixed",
                    top: `${position.top}px`,
                    left: `${position.left}px`,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="popover-header">
                    <h6 className="popover-title">New Schedule</h6>
                    <button
                        type="button"
                        className="popover-close-btn"
                        onClick={onClose}
                    >
                        <LuX size={16} />
                    </button>
                </div>

                {/* Locked info badges */}
                <div className="popover-locked-info">
                    <div className="popover-badge">
                        <LuDoorOpen size={13} />
                        <span>{shortCode(room.code)} ({room.type})</span>
                    </div>
                    <div className="popover-badge">
                        <LuCalendarDays size={13} />
                        <span>{DAY_LABELS[day] || day}</span>
                    </div>
                </div>

                {/* Time row */}
                <div className="popover-time-row">
                    <div className="popover-time-field">
                        <TimeSelectField
                            id="popover-start-time"
                            label="Start Time"
                            name="start_time"
                            value={formStartTime}
                            onChange={(value) => {
                                setFormStartTime(value);
                                setErrors((prev) => ({ ...prev, start_time: undefined, end_time: undefined }));
                            }}
                            error={errors.start_time}
                            required
                        />
                    </div>

                    <span className="popover-time-separator">–</span>

                    <div className="popover-time-field">
                        <TimeSelectField
                            id="popover-end-time"
                            label="End Time"
                            name="end_time"
                            value={formEndTime}
                            onChange={(value) => {
                                setFormEndTime(value);
                                setErrors((prev) => ({ ...prev, end_time: undefined }));
                            }}
                            error={errors.end_time}
                            required
                        />
                    </div>
                </div>

                {/* Subject */}
                <div className="popover-field">
                    <label className="popover-field-label">
                        Subject <span className="text-danger">*</span>
                    </label>
                    <SelectField
                        id="popover-subject"
                        name="subject_id"
                        placeholder="Select a subject"
                        value={subjectId}
                        onChange={(value) => {
                            setSubjectId(value);
                            setErrors((prev) => ({ ...prev, subject_id: undefined }));
                        }}
                        options={subjects}
                        renderOption={(s) => `${s.name} (${s.class_type || "N/A"})`}
                        error={errors.subject_id}
                        dropdownParent=".officer-inline-popover"
                    />
                </div>

                {/* Section */}
                <div className="popover-field">
                    <label className="popover-field-label">
                        Section <span className="text-danger">*</span>
                    </label>
                    <input
                        type="text"
                        className={`form-control form-control-sm ${errors.section ? "is-invalid" : ""}`}
                        placeholder="e.g. BSIT-1A"
                        value={section}
                        onChange={(e) => {
                            setSection(e.target.value.toUpperCase());
                            setErrors((prev) => ({ ...prev, section: undefined }));
                        }}
                    />
                    {errors.section && (
                        <div className="invalid-feedback d-block" style={{ fontSize: "0.7rem" }}>
                            {errors.section}
                        </div>
                    )}
                </div>

                {/* Professor */}
                <div className="popover-field">
                    <label className="popover-field-label">
                        Professor <span className="text-danger">*</span>
                    </label>
                    <SelectField
                        id="popover-professor"
                        name="professor_id"
                        placeholder="Select a professor"
                        value={professorId}
                        onChange={(value) => {
                            setProfessorId(value);
                            setErrors((prev) => ({ ...prev, professor_id: undefined }));
                        }}
                        options={professors}
                        error={errors.professor_id}
                        dropdownParent=".officer-inline-popover"
                    />
                </div>

                {/* Recurrence */}
                <div className="popover-field">
                    <label className="popover-field-label">
                        Repeat on
                    </label>
                    <DayRecurrenceSelector
                        selectedDays={selectedDays}
                        onChange={(days) => {
                            setSelectedDays(days);
                            setErrors((prev) => ({ ...prev, days: undefined }));
                            setConflictMessages({});
                        }}
                        lockedDay={day}
                    />
                    {errors.days && (
                        <div className="invalid-feedback d-block" style={{ fontSize: "0.7rem" }}>
                            {errors.days}
                        </div>
                    )}
                </div>

                {/* Conflict messages */}
                {Object.keys(conflictMessages).length > 0 && (
                    <div className="popover-conflicts">
                        {Object.entries(conflictMessages).map(([dayKey, msg]) => (
                            <div key={dayKey} className="popover-conflict-item">
                                <i className="bx bx-error-circle me-1"></i>
                                {msg}
                            </div>
                        ))}
                    </div>
                )}

                {/* Notes */}
                <div className="popover-field">
                    <label className="popover-field-label">Notes</label>
                    <textarea
                        className="form-control form-control-sm"
                        rows="2"
                        placeholder="Optional notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                {/* Actions */}
                <div className="popover-actions">
                    <button
                        type="button"
                        className="btn btn-sm btn-label-secondary"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={handleSubmit}
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-1" />
                                Saving...
                            </>
                        ) : (
                            selectedDays.length > 1
                                ? `Save ${selectedDays.length} Schedules`
                                : "Save Schedule"
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}
