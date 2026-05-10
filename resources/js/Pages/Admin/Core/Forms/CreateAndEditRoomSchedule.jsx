import { Link, useForm } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import FormSteps from "@/Components/Form/FormSteps";
import InputField from "@/Components/Input/InputField";
import SelectField from "@/Components/Input/SelectField";
import TimeSelectField from "@/Components/Input/TimeSelectField";

const FORM_STEPS = [
    {
        id: "subject-details",
        title: "Subject Details",
        subtitle: "Branch, department, and subject",
        icon: "bx bx-book-open",
    },
    {
        id: "schedule-details",
        title: "Schedule Details",
        subtitle: "Section, professor, schedule, and room",
        icon: "bx bx-time-five",
    },
];

const getInitialValues = (currentAcademicPeriodId, roomSchedule = null, returnContext = "") => ({
    academic_period_id: roomSchedule?.academic_period_id?.toString() ?? currentAcademicPeriodId?.toString() ?? "",
    branch_id: roomSchedule?.branch_id?.toString() ?? "",
    department_id: roomSchedule?.department_id?.toString() ?? "",
    subject_id: roomSchedule?.subject_id?.toString() ?? "",
    professor_id: roomSchedule?.professor_id?.toString() ?? "",
    room_id: roomSchedule?.room_id?.toString() ?? "",
    section: roomSchedule?.section ?? "",
    day_of_week: roomSchedule?.day_of_week ?? "",
    start_time: roomSchedule?.start_time ?? "",
    end_time: roomSchedule?.end_time ?? "",
    notes: roomSchedule?.notes ?? "",
    return_context: returnContext,
});

const getEmptyAvailabilityMeta = () => ({
    total_rooms: 0,
    available_count: 0,
});

const semesterLabels = {
    "1ST": "1st Semester",
    "2ND": "2nd Semester",
    "SUMMER": "SUMMER",
};

const formatTime = (value) => {
    if (!value) {
        return "Not set";
    }

    const [hour = "0", minute = "00"] = value.split(":");
    const date = new Date();

    date.setHours(Number(hour), Number(minute), 0, 0);

    return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
    });
};

const formatAcademicPeriod = (period) => {
    if (!period) {
        return "No current academic period set";
    }

    if (period.academic_year && period.semester) {
        return `A.Y. ${period.academic_year} - ${semesterLabels[period.semester] ?? period.semester}`;
    }

    return period.name || "No current academic period set";
};

const extractAjaxError = (xhr, fallbackMessage) => {
    const validationMessage = Object.values(xhr.responseJSON?.errors ?? {})
        .flat()
        .find(Boolean);

    return xhr.responseJSON?.message || validationMessage || fallbackMessage;
};

const getErrorStep = (errors) => {
    if (errors.branch_id || errors.department_id || errors.subject_id || errors.academic_period_id) {
        return 0;
    }

    if (errors.section || errors.professor_id || errors.day_of_week || errors.start_time || errors.end_time || errors.notes || errors.room_id) {
        return 1;
    }

    return 0;
};

export default function CreateAndEditRoomSchedule({
    academicPeriods,
    branches,
    departments,
    subjects,
    professors,
    currentAcademicPeriod,
    currentAcademicPeriodId,
    dayOptions,
    roomSchedule = null,
    backHref = null,
    returnContext = "",
}) {
    const isEditing = Boolean(roomSchedule?.id);
    const {
        data,
        setData,
        post,
        put,
        processing,
        errors,
        clearErrors,
        setError,
    } = useForm(getInitialValues(currentAcademicPeriodId, roomSchedule, returnContext));
    const [currentStep, setCurrentStep] = useState(0);
    const [availableRooms, setAvailableRooms] = useState([]);
    const [availabilityMeta, setAvailabilityMeta] = useState(getEmptyAvailabilityMeta());
    const [loadingAvailableRooms, setLoadingAvailableRooms] = useState(false);
    const [availabilityStatus, setAvailabilityStatus] = useState("idle");
    const [availabilityError, setAvailabilityError] = useState("");
    const hasErrors = Object.keys(errors).length > 0;

    const filteredDepartments = useMemo(() => {
        if (!data.branch_id) {
            return [];
        }

        return departments.filter((department) => department.branch_id?.toString() === data.branch_id?.toString());
    }, [departments, data.branch_id]);

    const filteredSubjects = useMemo(() => {
        if (!data.department_id) {
            return [];
        }

        return subjects.filter((subject) => subject.department_id?.toString() === data.department_id?.toString());
    }, [subjects, data.department_id]);

    const academicPeriodMap = useMemo(
        () => new Map(academicPeriods.map((period) => [period.id?.toString(), period])),
        [academicPeriods],
    );

    const branchMap = useMemo(
        () => new Map(branches.map((branch) => [branch.id?.toString(), branch])),
        [branches],
    );

    const dayLabels = useMemo(
        () => Object.fromEntries(dayOptions.map((option) => [option.id, option.name])),
        [dayOptions],
    );

    const selectedAcademicPeriod = useMemo(() => {
        if (data.academic_period_id) {
            return academicPeriodMap.get(data.academic_period_id?.toString()) ?? currentAcademicPeriod;
        }

        return currentAcademicPeriod;
    }, [academicPeriodMap, currentAcademicPeriod, data.academic_period_id]);

    const selectedBranch = branchMap.get(data.branch_id?.toString());
    const availabilityKey = useMemo(
        () => [
            data.academic_period_id,
            data.branch_id,
            data.day_of_week,
            data.start_time,
            data.end_time,
            roomSchedule?.id ?? "",
        ].join("::"),
        [
            data.academic_period_id,
            data.branch_id,
            data.day_of_week,
            data.start_time,
            data.end_time,
            roomSchedule?.id,
        ],
    );

    const canLoadAvailability = Boolean(
        data.academic_period_id
        && data.branch_id
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

    const isStepComplete = (stepIndex) => {
        if (stepIndex === 0) {
            return Boolean(
                data.academic_period_id
                && data.branch_id
                && data.department_id
                && data.subject_id,
            );
        }

        if (stepIndex === 1) {
            return Boolean(
                data.section
                && data.professor_id
                && data.day_of_week
                && data.start_time
                && data.end_time
                && data.end_time > data.start_time
                && data.room_id,
            );
        }

        return false;
    };

    const canNavigateToStep = (stepIndex) => {
        if (stepIndex <= currentStep) {
            return true;
        }

        if (stepIndex === 1) {
            return isStepComplete(0);
        }

        return false;
    };

    const validateStep = (stepIndex) => {
        clearErrors();

        if (stepIndex === 0) {
            let hasStepError = false;

            if (!data.academic_period_id) {
                setError("academic_period_id", "Set a current academic period first before adding room schedules.");
                hasStepError = true;
            }
            if (!data.branch_id) {
                setError("branch_id", "Select a branch.");
                hasStepError = true;
            }
            if (!data.department_id) {
                setError("department_id", "Select a department.");
                hasStepError = true;
            }
            if (!data.subject_id) {
                setError("subject_id", "Select a subject.");
                hasStepError = true;
            }

            if (hasStepError) {
                toastr.error("Complete the subject details before continuing.");
                setCurrentStep(0);
                return false;
            }

            return true;
        }

        if (stepIndex === 1) {
            let hasStepError = false;

            if (!data.section) {
                setError("section", "Enter a section name.");
                hasStepError = true;
            }
            if (!data.professor_id) {
                setError("professor_id", "Select a professor.");
                hasStepError = true;
            }
            if (!data.day_of_week) {
                setError("day_of_week", "Select a day.");
                hasStepError = true;
            }
            if (!data.start_time) {
                setError("start_time", "Select a start time.");
                hasStepError = true;
            }
            if (!data.end_time) {
                setError("end_time", "Select an end time.");
                hasStepError = true;
            }
            if (data.start_time && data.end_time && data.end_time <= data.start_time) {
                setError("end_time", "End time must be later than start time.");
                hasStepError = true;
            }

            if (hasStepError) {
                toastr.error("Complete the schedule details before saving.");
                setCurrentStep(1);
                return false;
            }

            if (loadingAvailableRooms || availabilityStatus === "idle") {
                const pendingMessage = "Please wait while available rooms are being checked.";

                setError("room_id", pendingMessage);
                toastr.error(pendingMessage);
                setCurrentStep(1);
                return false;
            }

            if (availabilityStatus === "error") {
                const failedMessage = availabilityError || "Unable to verify room availability. Please refresh and try again.";

                setError("room_id", failedMessage);
                toastr.error(failedMessage);
                setCurrentStep(1);
                return false;
            }

            if (!data.room_id) {
                const roomMessage = availabilityMeta.total_rooms === 0
                    ? "No rooms are registered for the selected branch yet."
                    : availabilityMeta.available_count === 0
                        ? "No rooms are available for the selected branch and schedule window."
                        : "Select one of the available rooms before saving.";

                setError("room_id", roomMessage);
                toastr.error(roomMessage);
                setCurrentStep(1);
                return false;
            }
        }

        return true;
    };

    const loadAvailableRooms = () => {
        if (!canLoadAvailability) {
            return;
        }

        setLoadingAvailableRooms(true);
        setAvailabilityStatus("loading");
        setAvailabilityError("");

        $.get(route("admin.core.room-schedules.available-rooms"), {
            academic_period_id: data.academic_period_id,
            branch_id: data.branch_id,
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

        if (availabilityStatus === "idle" && canLoadAvailability) {
            return "Available rooms will load automatically for the selected branch, day, and time.";
        }

        if (loadingAvailableRooms) {
            return "Checking room availability for the selected branch, day, and time.";
        }

        if (availabilityStatus === "error") {
            return availabilityError;
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
        loadingAvailableRooms,
    ]);

    const roomPlaceholder = useMemo(() => {
        if (!canLoadAvailability) {
            return "Select day and time first";
        }

        if (loadingAvailableRooms) {
            return "Checking available rooms...";
        }

        if (availabilityStatus === "idle") {
            return "Preparing available rooms...";
        }

        if (availableRooms.length > 0) {
            return "Select an available room";
        }

        return "No available rooms found";
    }, [availabilityStatus, availableRooms.length, canLoadAvailability, loadingAvailableRooms]);

    useEffect(() => {
        if (!hasErrors) {
            return;
        }

        setCurrentStep(getErrorStep(errors));
    }, [errors, hasErrors]);

    useEffect(() => {
        if (currentStep !== 1 || !canLoadAvailability) {
            return;
        }

        loadAvailableRooms();
    }, [availabilityKey, currentStep]);

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
            ? "No rooms are registered yet for the selected branch. Add a room first in Utilities > Room."
            : "No rooms are currently available for that branch, day, and time range. Try another schedule window.";

        setError("room_id", message);
    }, [availabilityStatus, availableRooms.length, availabilityMeta.total_rooms]);

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!validateStep(0) || !validateStep(1)) {
            return;
        }

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
            put(route("admin.core.room-schedules.update", roomSchedule.id), options);
            return;
        }

        post(route("admin.core.room-schedules.store"), options);
    };

    return (
        <div className="card">
            <div className="card-body p-4 p-xl-5">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
                    <div>
                        <h4 className="mb-1">
                            {isEditing ? "Edit Room Schedule" : "Create Room Schedule"}
                        </h4>
                        <p className="text-muted mb-0">
                            Assign the subject to any available room within the selected branch and schedule window.
                        </p>
                    </div>

                    <Link
                        href={backHref ?? route("admin.core.room-schedules.index")}
                        className="btn btn-label-secondary"
                    >
                        <i className="bx bx-arrow-back me-1"></i>
                        <span>Back</span>
                    </Link>
                </div>

                <form id="room-schedule-form" onSubmit={handleSubmit}>
                    <FormSteps
                        steps={FORM_STEPS}
                        currentStep={currentStep}
                        onStepChange={setCurrentStep}
                        canNavigateToStep={canNavigateToStep}
                    />

                    {currentStep === 0 && (
                        <>
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

                            <div className="row">
                                <div className="col-lg-6">
                                    <SelectField
                                        id="schedule-branch"
                                        label="Branch"
                                        name="branch_id"
                                        placeholder="Select a branch"
                                        value={data.branch_id}
                                        onChange={(value) => {
                                            clearErrors("branch_id");
                                            clearErrors("department_id");
                                            clearErrors("subject_id");
                                            clearErrors("room_id");
                                            setData((current) => ({
                                                ...current,
                                                branch_id: value,
                                                department_id: "",
                                                subject_id: "",
                                                room_id: "",
                                            }));
                                            resetAvailabilityState();
                                        }}
                                        options={branches}
                                        error={errors.branch_id}
                                        help="Choose the branch first so the rest of the academic hierarchy stays accurate."
                                        required
                                    />
                                </div>

                                <div className="col-lg-6">
                                    <SelectField
                                        id="schedule-department"
                                        label="Department"
                                        name="department_id"
                                        placeholder={data.branch_id ? "Select a department" : "Select a branch first"}
                                        value={data.department_id}
                                        onChange={(value) => {
                                            clearErrors("department_id");
                                            clearErrors("subject_id");
                                            setData((current) => ({
                                                ...current,
                                                department_id: value,
                                                subject_id: "",
                                            }));
                                        }}
                                        options={filteredDepartments}
                                        renderOption={(department) => `${department.code} - ${department.name}`}
                                        error={errors.department_id}
                                        help={data.branch_id
                                            ? "No departments found for the selected branch."
                                            : "Select a branch first before choosing a department."}
                                        disabled={!data.branch_id}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-lg-6">
                                    <SelectField
                                        id="schedule-subject"
                                        label="Subject"
                                        name="subject_id"
                                        placeholder={data.department_id ? "Select a subject" : "Select a department first"}
                                        value={data.subject_id}
                                        onChange={(value) => {
                                            clearErrors("subject_id");
                                            setData((current) => ({
                                                ...current,
                                                subject_id: value,
                                            }));
                                        }}
                                        options={filteredSubjects}
                                        renderOption={(subject) => `${subject.name} (${subject.class_type || "N/A"})`}
                                        error={errors.subject_id}
                                        help={data.department_id
                                            ? "No subjects found for the selected department."
                                            : "Select a department first before choosing a subject."}
                                        disabled={!data.department_id}
                                        required
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {currentStep === 1 && (
                        <>
                            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                                <div>
                                    <h6 className="mb-1">Schedule Details</h6>
                                    <p className="text-muted mb-0">
                                        Available rooms update from the selected branch, day, and time window.
                                    </p>
                                </div>

                                {availabilityStatus === "success" && (
                                    <div className="d-flex flex-wrap align-items-center gap-2">
                                        <span className="badge bg-label-primary">
                                            {availabilityMeta.available_count} available
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="row">
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
                                        help="Create a professor first in Utilities if the person is not listed yet."
                                        required
                                    />
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-md-4">
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
                                </div>

                                <div className="col-md-4">
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
                                </div>

                                <div className="col-md-4">
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
                                </div>
                            </div>

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
                                renderOption={(room) => `${room.code} (${room.type})`}
                                error={errors.room_id}
                                help={roomFieldHelp}
                                disabled={!canLoadAvailability || loadingAvailableRooms || availableRooms.length === 0}
                                required
                            />

                            {!errors.room_id && availabilityStatus === "success" && availableRooms.length > 0 && (
                                <div className="form-text mb-3">
                                    Showing {availabilityMeta.available_count} available room(s) for{" "}
                                    {selectedBranch?.name || "the selected branch"} on{" "}
                                    {dayLabels[data.day_of_week] ?? data.day_of_week} from {formatTime(data.start_time)} to {formatTime(data.end_time)}.
                                </div>
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
                                        clearErrors("notes");
                                        setData("notes", event.target.value);
                                    }}
                                    style={errors.notes ? { borderColor: "#fc4225" } : {}}
                                />
                                {errors.notes && (
                                    <div className="invalid-feedback d-block">{errors.notes}</div>
                                )}
                                {!errors.notes && (
                                    <div className="form-text">
                                        Optional reminders such as shared equipment, lab setup, or room preferences.
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 border-top pt-4 mt-4">
                        <button
                            type="button"
                            className={`btn ${currentStep > 0 ? "btn-outline-secondary" : "btn-label-secondary"}`}
                            onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}
                            disabled={currentStep === 0}
                        >
                            <i className="bx bx-chevron-left me-1"></i>
                            <span>Previous</span>
                        </button>

                        <div className="d-flex flex-wrap justify-content-end gap-2">
                            {currentStep < FORM_STEPS.length - 1 ? (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => {
                                        if (!validateStep(currentStep)) {
                                            return;
                                        }

                                        setCurrentStep((step) => Math.min(step + 1, FORM_STEPS.length - 1));
                                    }}
                                >
                                    <span>Next</span>
                                    <i className="bx bx-chevron-right ms-1"></i>
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={processing || loadingAvailableRooms || availabilityStatus === "idle"}
                                >
                                    {processing
                                        ? "Saving..."
                                        : (isEditing ? "Update Schedule" : "Save Schedule")}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
