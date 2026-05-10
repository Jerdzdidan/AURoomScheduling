import { useEffect, useMemo, useRef, useState } from "react";
import DayRecurrenceSelector from "@/Components/Input/DayRecurrenceSelector";
import SelectField from "@/Components/Input/SelectField";
import TimeSelectField from "@/Components/Input/TimeSelectField";
import { LuX, LuDoorOpen, LuCalendarDays } from "react-icons/lu";

const DAY_LABELS = {
    MONDAY: "Monday",
    TUESDAY: "Tuesday",
    WEDNESDAY: "Wednesday",
    THURSDAY: "Thursday",
    FRIDAY: "Friday",
    SATURDAY: "Saturday",
    SUNDAY: "Sunday",
};

const shortCode = (code) => {
    if (!code) return "";
    const idx = code.indexOf("-");
    return idx !== -1 ? code.substring(idx + 1) : code;
};

export default function AdminInlineSchedulePopover({
    day,
    startTime,
    endTime,
    room,
    branches,
    departments,
    subjects,
    professors,
    currentAcademicPeriodId,
    anchorRect,
    calendarRect,
    onClose,
    onSaved,
}) {
    const popoverRef = useRef(null);

    // Cascade state
    const [branchId, setBranchId] = useState(room?.branch_id ? String(room.branch_id) : "");
    const [departmentId, setDepartmentId] = useState("");
    const [subjectId, setSubjectId] = useState("");

    // Other form fields
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

    // Filtered departments based on branch
    const filteredDepartments = useMemo(() => {
        if (!branchId) return [];
        return departments.filter((d) => String(d.branch_id) === String(branchId));
    }, [departments, branchId]);

    // Filtered subjects based on department
    const filteredSubjects = useMemo(() => {
        if (!departmentId) return [];
        return subjects.filter((s) => String(s.department_id) === String(departmentId));
    }, [subjects, departmentId]);

    useEffect(() => {
        if (!popoverRef.current || !anchorRect || !calendarRect) return;

        const popover = popoverRef.current;

        requestAnimationFrame(() => {
            const popoverRect = popover.getBoundingClientRect();
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;

            let left = anchorRect.right + 12;
            let top = anchorRect.top;

            if (left + popoverRect.width > viewportW - 16) {
                left = anchorRect.left - popoverRect.width - 12;
            }

            if (top + popoverRect.height > viewportH - 16) {
                top = viewportH - popoverRect.height - 16;
            }

            if (top < 16) {
                top = 16;
            }

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

        if (!branchId) newErrors.branch_id = "Select a branch.";
        if (!departmentId) newErrors.department_id = "Select a department.";
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
            url: route("admin.core.room-schedules.ajax-store"),
            type: "POST",
            data: {
                academic_period_id: currentAcademicPeriodId,
                branch_id: branchId,
                department_id: departmentId,
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
                            id="admin-popover-start-time"
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
                            id="admin-popover-end-time"
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

                {/* Branch */}
                <div className="popover-field">
                    <label className="popover-field-label">
                        Branch <span className="text-danger">*</span>
                    </label>
                    <SelectField
                        id="admin-popover-branch"
                        name="branch_id"
                        placeholder="Select a branch"
                        value={branchId}
                        onChange={(value) => {
                            setBranchId(value);
                            setDepartmentId("");
                            setSubjectId("");
                            setErrors((prev) => ({ ...prev, branch_id: undefined }));
                        }}
                        options={branches}
                        renderOption={(b) => `${b.code} – ${b.name}`}
                        error={errors.branch_id}
                        dropdownParent=".officer-inline-popover"
                    />
                </div>

                {/* Department */}
                <div className="popover-field">
                    <label className="popover-field-label">
                        Department <span className="text-danger">*</span>
                    </label>
                    <SelectField
                        id="admin-popover-department"
                        name="department_id"
                        placeholder={branchId ? "Select a department" : "Select a branch first"}
                        value={departmentId}
                        onChange={(value) => {
                            setDepartmentId(value);
                            setSubjectId("");
                            setErrors((prev) => ({ ...prev, department_id: undefined }));
                        }}
                        options={filteredDepartments}
                        renderOption={(d) => `${d.code} – ${d.name}`}
                        error={errors.department_id}
                        disabled={!branchId}
                        dropdownParent=".officer-inline-popover"
                    />
                </div>

                {/* Subject */}
                <div className="popover-field">
                    <label className="popover-field-label">
                        Subject <span className="text-danger">*</span>
                    </label>
                    <SelectField
                        id="admin-popover-subject"
                        name="subject_id"
                        placeholder={departmentId ? "Select a subject" : "Select a department first"}
                        value={subjectId}
                        onChange={(value) => {
                            setSubjectId(value);
                            setErrors((prev) => ({ ...prev, subject_id: undefined }));
                        }}
                        options={filteredSubjects}
                        renderOption={(s) => `${s.name} (${s.class_type || "N/A"})`}
                        error={errors.subject_id}
                        disabled={!departmentId}
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
                        id="admin-popover-professor"
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
