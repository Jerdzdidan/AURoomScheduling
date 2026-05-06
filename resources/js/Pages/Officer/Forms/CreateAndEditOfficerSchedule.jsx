import { Link, useForm } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import InputField from "@/Components/Input/InputField";
import SelectField from "@/Components/Input/SelectField";
import TimeSelectField from "@/Components/Input/TimeSelectField";
import { LuUniversity, LuLayoutList, LuLock } from "react-icons/lu";

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

const formatTime = (value) => {
    if (!value) return "Not set";

    const [hour = "0", minute = "00"] = value.split(":");
    const date = new Date();

    date.setHours(Number(hour), Number(minute), 0, 0);

    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const formatAcademicPeriod = (period) => {
    if (!period) return "No current academic period set";

    if (period.academic_year && period.semester) {
        return `A.Y. ${period.academic_year} – ${semesterLabels[period.semester] ?? period.semester}`;
    }

    return period.name || "No current academic period set";
};

const extractAjaxError = (xhr, fallbackMessage) => {
    const validationMessage = Object.values(xhr.responseJSON?.errors ?? {})
        .flat()
        .find(Boolean);

    return xhr.responseJSON?.message || validationMessage || fallbackMessage;
};

const getEmptyAvailabilityMeta = () => ({
    total_rooms: 0,
    available_count: 0,
});

const getInitialValues = (currentAcademicPeriodId, roomSchedule = null) => ({
    academic_period_id: roomSchedule?.academic_period_id?.toString() ?? currentAcademicPeriodId?.toString() ?? "",
    subject_id: roomSchedule?.subject_id?.toString() ?? "",
    professor_id: roomSchedule?.professor_id?.toString() ?? "",
    room_id: roomSchedule?.room_id?.toString() ?? "",
    section: roomSchedule?.section ?? "",
    day_of_week: roomSchedule?.day_of_week ?? "",
    start_time: roomSchedule?.start_time ?? "",
    end_time: roomSchedule?.end_time ?? "",
    notes: roomSchedule?.notes ?? "",
});

export default function CreateAndEditOfficerSchedule({
    subjects,
    professors,
    currentAcademicPeriod,
    currentAcademicPeriodId,
    dayOptions,
    branchName,
    branchCode,
    departmentName,
    departmentCode,
    roomSchedule = null,
    backHref = null,
}) {
    const isEditing = Boolean(roomSchedule?.id);
    const isAdminCreatedSchedule = Boolean(isEditing && roomSchedule?.is_created_by_admin);
    const {
        data,
        setData,
        post,
        put,
        processing,
        errors,
        clearErrors,
        setError,
    } = useForm(getInitialValues(currentAcademicPeriodId, roomSchedule));

    const [availableRooms, setAvailableRooms] = useState([]);
    const [availabilityMeta, setAvailabilityMeta] = useState(getEmptyAvailabilityMeta());
    const [loadingAvailableRooms, setLoadingAvailableRooms] = useState(false);
    const [availabilityStatus, setAvailabilityStatus] = useState("idle");
    const [availabilityError, setAvailabilityError] = useState("");

    const dayLabels = useMemo(
        () => Object.fromEntries(dayOptions.map((option) => [option.id, option.name])),
        [dayOptions],
    );

    const selectedAcademicPeriod = useMemo(() => {
        return currentAcademicPeriod;
    }, [currentAcademicPeriod]);

    const selectedDayLabel = dayLabels[data.day_of_week] ?? data.day_of_week ?? "Not set";
    const selectedRoomLabel = useMemo(() => {
        if (!roomSchedule?.room_code) {
            return "Not assigned";
        }

        const roomType = roomSchedule?.room_type ? ` (${roomSchedule.room_type})` : "";

        return `${shortCode(roomSchedule.room_code)}${roomType}`;
    }, [roomSchedule?.room_code, roomSchedule?.room_type]);

    const availabilityKey = useMemo(
        () => [
            data.academic_period_id,
            data.day_of_week,
            data.start_time,
            data.end_time,
            roomSchedule?.id ?? "",
        ].join("::"),
        [data.academic_period_id, data.day_of_week, data.start_time, data.end_time, roomSchedule?.id],
    );

    const canLoadAvailability = Boolean(
        !isAdminCreatedSchedule
        &&
        data.academic_period_id
        && data.day_of_week
        && data.start_time
        && data.end_time
        && data.end_time > data.start_time,
    );

    const resetAvailabilityState = () => {
        setAvailableRooms([]);
        setAvailabilityMeta(getEmptyAvailabilityMeta());
        setAvailabilityStatus("idle");
        setAvailabilityError("");
        setLoadingAvailableRooms(false);
    };

    const loadAvailableRooms = () => {
        if (!canLoadAvailability) return;

        setLoadingAvailableRooms(true);
        setAvailabilityStatus("loading");
        setAvailabilityError("");

        $.get(route("officer.schedules.available-rooms"), {
            academic_period_id: data.academic_period_id,
            day_of_week: data.day_of_week,
            start_time: data.start_time,
            end_time: data.end_time,
            ...(roomSchedule?.id ? { schedule_id: roomSchedule.id } : {}),
        })
            .done((response) => {
                const rooms = response.rooms ?? [];

                setAvailableRooms(rooms);
                setAvailabilityMeta({
                    total_rooms: response.total_rooms ?? 0,
                    available_count: response.available_count ?? rooms.length,
                });
                setAvailabilityStatus("success");

                if (data.room_id && !rooms.some((room) => room.id?.toString() === data.room_id?.toString())) {
                    setData("room_id", "");
                }
            })
            .fail((xhr) => {
                const message = extractAjaxError(xhr, "Failed to load available rooms.");

                setAvailabilityError(message);
                setAvailableRooms([]);
                setAvailabilityMeta(getEmptyAvailabilityMeta());
                setAvailabilityStatus("error");
                setData("room_id", "");
                toastr.error(message);
            })
            .always(() => {
                setLoadingAvailableRooms(false);
            });
    };

    const roomFieldHelp = useMemo(() => {
        if (!data.day_of_week || !data.start_time || !data.end_time) {
            return "Select the day, start time, and end time to load available rooms.";
        }

        if (isAdminCreatedSchedule) {
            return "Room selection is locked because this schedule was created by an admin.";
        }

        if (availabilityStatus === "idle" && canLoadAvailability) {
            return "Only rooms assigned to your department will load automatically here.";
        }

        if (loadingAvailableRooms) {
            return "Checking room availability for the selected day and time.";
        }

        if (availabilityStatus === "error") {
            return availabilityError;
        }


        if (availabilityStatus === "success" && availableRooms.length === 0) {
            return "";
        }

        return "";
    }, [
        availabilityError,
        availabilityMeta.total_rooms,
        availabilityStatus,
        availableRooms.length,
        canLoadAvailability,
        data.day_of_week,
        data.end_time,
        data.start_time,
        isAdminCreatedSchedule,
        loadingAvailableRooms,
    ]);

    const roomPlaceholder = useMemo(() => {
        if (isAdminCreatedSchedule) return "Room is locked";
        if (!canLoadAvailability) return "Select day and time first";
        if (loadingAvailableRooms) return "Checking available rooms...";
        if (availabilityStatus === "idle") return "Preparing available rooms...";
        if (availableRooms.length > 0) return "Select an available room";

        return "No available rooms found";
    }, [availabilityStatus, availableRooms.length, canLoadAvailability, isAdminCreatedSchedule, loadingAvailableRooms]);

    useEffect(() => {
        if (!canLoadAvailability) return;

        loadAvailableRooms();
    }, [availabilityKey]);

    // Show inline error on end_time when it's not later than start_time
    useEffect(() => {
        if (data.start_time && data.end_time && data.end_time <= data.start_time) {
            setError("end_time", "End time must be later than start time.");
            setError("start_time", "Start time must be earlier than end time.");
        } else {
            clearErrors("end_time");
            clearErrors("start_time");
        }
    }, [data.start_time, data.end_time]);

    // Show error when no rooms are available after a successful check
    useEffect(() => {
        if (availabilityStatus !== "success" || availableRooms.length > 0) return;

        const message = availabilityMeta.total_rooms === 0
            ? "No rooms are assigned yet for your department. Contact your administrator."
            : "No assigned rooms are currently available for that day and time range. Try another schedule window.";

        setError("room_id", message);
    }, [availabilityStatus, availableRooms.length, availabilityMeta.total_rooms]);

    const validateForm = () => {
        clearErrors();
        let hasError = false;

        if (!data.academic_period_id) {
            setError("academic_period_id", "Set a current academic period first.");
            hasError = true;
        }
        if (!data.subject_id) {
            setError("subject_id", "Select a subject.");
            hasError = true;
        }
        if (!data.section) {
            setError("section", "Enter a section name.");
            hasError = true;
        }
        if (!data.professor_id) {
            setError("professor_id", "Select a professor.");
            hasError = true;
        }
        if (!data.day_of_week) {
            setError("day_of_week", "Select a day.");
            hasError = true;
        }
        if (!data.start_time) {
            setError("start_time", "Select a start time.");
            hasError = true;
        }
        if (!data.end_time) {
            setError("end_time", "Select an end time.");
            hasError = true;
        }
        if (data.start_time && data.end_time && data.end_time <= data.start_time) {
            setError("end_time", "End time must be later than start time.");
            hasError = true;
        }

        if (!isAdminCreatedSchedule) {
            if (loadingAvailableRooms || availabilityStatus === "idle") {
                setError("room_id", "Please wait while available rooms are being checked.");
                hasError = true;
            } else if (availabilityStatus === "error") {
                setError("room_id", availabilityError || "Unable to verify room availability.");
                hasError = true;
            } else if (!data.room_id) {
                const roomMessage = availabilityMeta.total_rooms === 0
                    ? "No rooms are registered for your department yet."
                    : availabilityMeta.available_count === 0
                        ? "No rooms are available for the selected schedule window."
                        : "Select one of the available rooms before saving.";

                setError("room_id", roomMessage);
                hasError = true;
            }
        }

        if (hasError) {
            toastr.error("Please complete all required fields.");
        }

        return !hasError;
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!validateForm()) return;

        const options = {
            onSuccess: () => {
                toastr.success(
                    isEditing
                        ? "Room schedule updated successfully."
                        : "Room schedule created successfully.",
                );
            },
        };

        if (isEditing) {
            put(route("officer.schedules.update", roomSchedule.id), options);
            return;
        }

        post(route("officer.schedules.store"), options);
    };

    return (
        <div className="card">
            <div className="card-body p-4 p-xl-5">
                {/* ── Header ──────────────────────────────── */}
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
                    <div>
                        <h4 className="mb-1">
                            {isEditing ? "Edit Room Schedule" : "Create Room Schedule"}
                        </h4>
                        <p className="text-muted mb-0">
                            {isAdminCreatedSchedule
                                ? "This schedule was created by an admin. You can update the subject, section, and professor only."
                                : "Assign a subject to an available room that is assigned to your department."}
                        </p>
                    </div>

                    {isEditing && backHref && (
                        <Link
                            href={backHref}
                            className="btn btn-label-secondary"
                        >
                            <i className="bx bx-arrow-back me-1"></i>
                            <span>Back</span>
                        </Link>
                    )}
                </div>

                {/* ── Academic Period Banner ───────────────── */}
                <div className="room-schedule-period-banner mb-4">
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                        <div>
                            <span className="badge bg-label-primary mb-2">
                                {isEditing ? "Assigned Academic Period" : "Current Academic Period"}
                            </span>
                            <h6 className="mb-1">{formatAcademicPeriod(selectedAcademicPeriod)}</h6>
                            <p className="text-muted mb-0">
                                {selectedAcademicPeriod
                                    ? ""
                                    : "Set a current academic period first in Utilities before creating a room schedule."}
                            </p>
                        </div>

                        <span className={`badge ${selectedAcademicPeriod ? "bg-success" : "bg-secondary"}`}>
                            {selectedAcademicPeriod ? "Selected" : "Unavailable"}
                        </span>
                    </div>

                    {errors.academic_period_id && (
                        <div className="invalid-feedback d-block mt-3">
                            {errors.academic_period_id}
                        </div>
                    )}
                </div>

                {/* ── Locked Branch & Department ──────────── */}
                <div className="row mb-4">
                    <div className="col-md-6 mb-3 mb-md-0">
                        <div className="officer-form-locked-field">
                            <div className="locked-icon">
                                <LuUniversity size={16} />
                            </div>
                            <div>
                                <div className="locked-label">Branch</div>
                                <div className="locked-value">
                                    {branchCode && `${branchCode} – `}{branchName || "Not assigned"}
                                </div>
                            </div>
                            <LuLock size={14} className="ms-auto text-muted" />
                        </div>
                    </div>

                    <div className="col-md-6">
                        <div className="officer-form-locked-field">
                            <div className="locked-icon">
                                <LuLayoutList size={16} />
                            </div>
                            <div>
                                <div className="locked-label">Department</div>
                                <div className="locked-value">
                                    {departmentCode && `${departmentCode} – `}{departmentName || "Not assigned"}
                                </div>
                            </div>
                            <LuLock size={14} className="ms-auto text-muted" />
                        </div>
                    </div>
                </div>

                {isAdminCreatedSchedule && (
                    <div className="alert alert-warning mb-4" role="alert">
                        Day, time range, room, and notes are locked because this schedule was created by an admin.
                    </div>
                )}

                {/* ── Form ────────────────────────────────── */}
                <form id="officer-schedule-form" onSubmit={handleSubmit}>
                    <div className="row">
                        <div className="col-md-6">
                            <SelectField
                                id="schedule-subject"
                                label="Subject"
                                name="subject_id"
                                placeholder="Select a subject"
                                value={data.subject_id}
                                onChange={(value) => {
                                    clearErrors("subject_id");
                                    setData("subject_id", value);
                                }}
                                options={subjects}
                                renderOption={(subject) => `${subject.name} (${subject.class_type || "N/A"})`}
                                error={errors.subject_id}
                                help="Only subjects from your department are listed."
                                required
                            />
                        </div>

                        <div className="col-md-6">
                            <InputField
                                id="schedule-section"
                                label="Section"
                                name="section"
                                icon="bx bx-grid-alt"
                                placeholder="BSIT-1A"
                                value={data.section}
                                onChange={(event) => {
                                    clearErrors("section");
                                    setData("section", event.target.value.toUpperCase());
                                }}
                                error={errors.section}
                                help=""
                                required
                            />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-6">
                            <SelectField
                                id="schedule-professor"
                                label="Professor"
                                name="professor_id"
                                placeholder="Select a professor"
                                value={data.professor_id}
                                onChange={(value) => {
                                    clearErrors("professor_id");
                                    setData("professor_id", value);
                                }}
                                options={professors}
                                error={errors.professor_id}
                                required
                            />
                        </div>

                        <div className="col-md-6">
                            {isAdminCreatedSchedule ? (
                                <InputField
                                    id="schedule-day"
                                    label="Day"
                                    name="day_of_week"
                                    value={selectedDayLabel}
                                    onChange={() => {}}
                                    error={errors.day_of_week}
                                    help="Day is locked for admin-created schedules."
                                    readOnly
                                    disabled
                                />
                            ) : (
                                <SelectField
                                    id="schedule-day"
                                    label="Day"
                                    name="day_of_week"
                                    placeholder="Select a day"
                                    value={data.day_of_week}
                                    onChange={(value) => {
                                        clearErrors("day_of_week");
                                        clearErrors("room_id");
                                        setData((current) => ({
                                            ...current,
                                            day_of_week: value,
                                            room_id: "",
                                        }));
                                        resetAvailabilityState();
                                    }}
                                    options={dayOptions}
                                    error={errors.day_of_week}
                                    required
                                />
                            )}
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-6">
                            {isAdminCreatedSchedule ? (
                                <InputField
                                    id="schedule-start-time"
                                    label="Start Time"
                                    name="start_time"
                                    value={formatTime(data.start_time)}
                                    onChange={() => {}}
                                    error={errors.start_time}
                                    help="Start time is locked for admin-created schedules."
                                    readOnly
                                    disabled
                                />
                            ) : (
                                <TimeSelectField
                                    id="schedule-start-time"
                                    label="Start Time"
                                    name="start_time"
                                    value={data.start_time}
                                    onChange={(value) => {
                                        clearErrors("start_time");
                                        clearErrors("room_id");
                                        setData((current) => ({
                                            ...current,
                                            start_time: value,
                                            room_id: "",
                                        }));
                                        resetAvailabilityState();
                                    }}
                                    error={errors.start_time}
                                    help="Allowed schedule window is 7:30 AM to 8:30 PM."
                                    required
                                />
                            )}
                        </div>

                        <div className="col-md-6">
                            {isAdminCreatedSchedule ? (
                                <InputField
                                    id="schedule-end-time"
                                    label="End Time"
                                    name="end_time"
                                    value={formatTime(data.end_time)}
                                    onChange={() => {}}
                                    error={errors.end_time}
                                    help="End time is locked for admin-created schedules."
                                    readOnly
                                    disabled
                                />
                            ) : (
                                <TimeSelectField
                                    id="schedule-end-time"
                                    label="End Time"
                                    name="end_time"
                                    value={data.end_time}
                                    onChange={(value) => {
                                        clearErrors("end_time");
                                        clearErrors("room_id");
                                        setData((current) => ({
                                            ...current,
                                            end_time: value,
                                            room_id: "",
                                        }));
                                        resetAvailabilityState();
                                    }}
                                    error={errors.end_time}
                                    help="Allowed schedule window is 7:30 AM to 8:30 PM."
                                    required
                                />
                            )}
                        </div>
                    </div>

                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                        <div>
                            <h6 className="mb-1">Room Selection</h6>
                            <p className="text-muted mb-0">
                                {isAdminCreatedSchedule
                                    ? "This room assignment is locked because the schedule was created by an admin."
                                    : "Available rooms update based on the selected day and time window, but only department-assigned rooms can be scheduled here."}
                            </p>
                        </div>

                        {!isAdminCreatedSchedule && availabilityStatus === "success" && (
                            <div className="d-flex flex-wrap align-items-center gap-2">
                                <span className="badge bg-label-primary">
                                    {availabilityMeta.available_count} available
                                </span>
                            </div>
                        )}
                    </div>

                    {isAdminCreatedSchedule ? (
                        <InputField
                            id="schedule-room"
                            label="Assigned Room"
                            name="room_id"
                            value={selectedRoomLabel}
                            onChange={() => {}}
                            error={errors.room_id}
                            help={roomFieldHelp}
                            readOnly
                            disabled
                        />
                    ) : (
                        <>
                            <SelectField
                                id="schedule-room"
                                label="Available Room"
                                name="room_id"
                                placeholder={roomPlaceholder}
                                value={data.room_id}
                                onChange={(value) => {
                                    clearErrors("room_id");
                                    setData("room_id", value);
                                }}
                                options={availableRooms}
                                renderOption={(room) => `${shortCode(room.code)} (${room.type})`}
                                error={errors.room_id}
                                help={roomFieldHelp}
                                disabled={!canLoadAvailability || loadingAvailableRooms || availableRooms.length === 0}
                                required
                            />

                            {!errors.room_id && availabilityStatus === "success" && availableRooms.length > 0 && (
                                <div className="form-text mb-3">
                                    Showing {availabilityMeta.available_count} available room(s) for{" "}
                                    {departmentName || "your department"} on{" "}
                                    {dayLabels[data.day_of_week] ?? data.day_of_week} from {formatTime(data.start_time)} to {formatTime(data.end_time)}.
                                </div>
                            )}
                        </>
                    )}

                    <div className="mb-0">
                        <label className="form-label" htmlFor="schedule-notes">
                            Notes
                        </label>
                        <textarea
                            id="schedule-notes"
                            name="notes"
                            rows="4"
                            className="form-control"
                            placeholder="Optional notes about this schedule"
                            value={data.notes}
                            onChange={(event) => {
                                if (isAdminCreatedSchedule) {
                                    return;
                                }
                                clearErrors("notes");
                                setData("notes", event.target.value);
                            }}
                            readOnly={isAdminCreatedSchedule}
                            style={errors.notes ? { borderColor: "#fc4225" } : {}}
                        />
                        {errors.notes && (
                            <div className="invalid-feedback d-block">{errors.notes}</div>
                        )}
                        {!errors.notes && (
                            <div className="form-text">
                                {isAdminCreatedSchedule
                                    ? "Notes are locked for schedules created by an admin."
                                    : "Optional reminders such as shared equipment, lab setup, or room preferences."}
                            </div>
                        )}
                    </div>

                    {/* ── Submit ───────────────────────────── */}
                    <div className="d-flex flex-wrap justify-content-end gap-2 border-top pt-4 mt-4">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={processing || (!isAdminCreatedSchedule && (loadingAvailableRooms || availabilityStatus === "idle"))}
                        >
                            {processing
                                ? "Saving..."
                                : (isEditing ? "Update Schedule" : "Save Schedule")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
