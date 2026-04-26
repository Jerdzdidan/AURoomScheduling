import { useForm } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import ModalForm from "@/Components/Form/ModalForm";
import WizardSteps from "@/Components/Form/WizardSteps";
import InputField from "@/Components/Input/InputField";
import SelectField from "@/Components/Input/SelectField";
import TimeSelectField from "@/Components/Input/TimeSelectField";

const WIZARD_STEPS = [
    {
        id: "course-details",
        title: "Course Details",
        subtitle: "Branch, department, program, and subject",
        icon: "bx bx-book-open",
    },
    {
        id: "schedule-details",
        title: "Schedule Details",
        subtitle: "Section, professor, day, time, and notes",
        icon: "bx bx-time-five",
    },
    {
        id: "room-assignment",
        title: "Room Assignment",
        subtitle: "Pick from rooms available in that branch and time slot",
        icon: "bx bx-door-open",
    },
];

const getInitialValues = (currentAcademicPeriodId) => ({
    academic_period_id: currentAcademicPeriodId?.toString() ?? "",
    branch_id: "",
    department_id: "",
    program_id: "",
    subject_id: "",
    professor_id: "",
    room_id: "",
    section: "",
    day_of_week: "",
    start_time: "",
    end_time: "",
    notes: "",
});

const getEmptyAvailabilityMeta = () => ({
    total_rooms: 0,
    available_count: 0,
});

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

    return period.name || [period.academic_year, period.semester].filter(Boolean).join(" - ");
};

const extractAjaxError = (xhr, fallbackMessage) => {
    const validationMessage = Object.values(xhr.responseJSON?.errors ?? {})
        .flat()
        .find(Boolean);

    return xhr.responseJSON?.message || validationMessage || fallbackMessage;
};

const getErrorStep = (errors) => {
    if (errors.branch_id || errors.department_id || errors.program_id || errors.subject_id || errors.academic_period_id) {
        return 0;
    }

    if (errors.section || errors.professor_id || errors.day_of_week || errors.start_time || errors.end_time || errors.notes) {
        return 1;
    }

    if (errors.room_id) {
        return 2;
    }

    return 0;
};

function SummaryItem({ label, value }) {
    return (
        <div>
            <span className="text-muted small d-block">{label}</span>
            <span className="fw-semibold">{value || "Not selected yet"}</span>
        </div>
    );
}

function RoomOptionCard({ room, selected, onSelect }) {
    return (
        <button
            type="button"
            className={`room-schedule-room-card ${selected ? "is-selected" : ""}`}
            onClick={() => onSelect(room.id)}
        >
            <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                    <h6 className="mb-1">{room.code}</h6>
                    <div className="room-meta">
                        {room.building_code} - {room.building_name}
                    </div>
                </div>

                <span className={`badge ${selected ? "bg-primary" : "bg-label-primary"}`}>
                    {selected ? "Selected" : "Available"}
                </span>
            </div>

            <div className="d-flex align-items-center gap-2 mt-3 text-muted small">
                <i className="bx bx-category-alt"></i>
                <span>{room.type}</span>
            </div>
        </button>
    );
}

export default function CreateAndEditRoomSchedule({
    editId,
    academicPeriods,
    branches,
    departments,
    programs,
    subjects,
    professors,
    currentAcademicPeriod,
    currentAcademicPeriodId,
    dayOptions,
    onSuccess,
}) {
    const isEditing = !!editId;
    const {
        data,
        setData,
        post,
        put,
        processing,
        errors,
        clearErrors,
        setError,
    } = useForm("roomScheduleForm", getInitialValues(currentAcademicPeriodId));
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

    const filteredPrograms = useMemo(() => {
        if (!data.department_id) {
            return [];
        }

        return programs.filter((program) => program.department_id?.toString() === data.department_id?.toString());
    }, [programs, data.department_id]);

    const filteredSubjects = useMemo(() => {
        if (!data.program_id) {
            return [];
        }

        return subjects.filter((subject) => subject.program_id?.toString() === data.program_id?.toString());
    }, [subjects, data.program_id]);

    const academicPeriodMap = useMemo(
        () => new Map(academicPeriods.map((period) => [period.id?.toString(), period])),
        [academicPeriods],
    );

    const branchMap = useMemo(
        () => new Map(branches.map((branch) => [branch.id?.toString(), branch])),
        [branches],
    );

    const departmentMap = useMemo(
        () => new Map(departments.map((department) => [department.id?.toString(), department])),
        [departments],
    );

    const programMap = useMemo(
        () => new Map(programs.map((program) => [program.id?.toString(), program])),
        [programs],
    );

    const subjectMap = useMemo(
        () => new Map(subjects.map((subject) => [subject.id?.toString(), subject])),
        [subjects],
    );

    const professorMap = useMemo(
        () => new Map(professors.map((professor) => [professor.id?.toString(), professor])),
        [professors],
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
    const selectedDepartment = departmentMap.get(data.department_id?.toString());
    const selectedProgram = programMap.get(data.program_id?.toString());
    const selectedSubject = subjectMap.get(data.subject_id?.toString());
    const selectedProfessor = professorMap.get(data.professor_id?.toString());
    const selectedRoom = useMemo(
        () => availableRooms.find((room) => room.id?.toString() === data.room_id?.toString()) ?? null,
        [availableRooms, data.room_id],
    );

    const availabilityKey = useMemo(
        () => [
            data.academic_period_id,
            data.branch_id,
            data.day_of_week,
            data.start_time,
            data.end_time,
            editId ?? "",
        ].join("::"),
        [
            data.academic_period_id,
            data.branch_id,
            data.day_of_week,
            data.start_time,
            data.end_time,
            editId,
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

    const resetWizardState = () => {
        setCurrentStep(0);
        resetAvailabilityState();
    };

    const isStepComplete = (stepIndex) => {
        if (stepIndex === 0) {
            return Boolean(
                data.academic_period_id
                && data.branch_id
                && data.department_id
                && data.program_id
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
                && data.end_time > data.start_time,
            );
        }

        if (stepIndex === 2) {
            return Boolean(data.room_id);
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

        if (stepIndex === 2) {
            return isStepComplete(0) && isStepComplete(1);
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
            if (!data.program_id) {
                setError("program_id", "Select a program.");
                hasStepError = true;
            }
            if (!data.subject_id) {
                setError("subject_id", "Select a subject.");
                hasStepError = true;
            }

            if (hasStepError) {
                toastr.error("Complete the course details before continuing.");
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
                toastr.error("Complete the schedule details before continuing.");
                setCurrentStep(1);
                return false;
            }

            return true;
        }

        if (loadingAvailableRooms || availabilityStatus === "idle") {
            const pendingMessage = "Please wait while available rooms are being checked.";

            setError("room_id", pendingMessage);
            toastr.error(pendingMessage);
            setCurrentStep(2);
            return false;
        }

        if (availabilityStatus === "error") {
            const failedMessage = availabilityError || "Unable to verify room availability. Please refresh and try again.";

            setError("room_id", failedMessage);
            toastr.error(failedMessage);
            setCurrentStep(2);
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
            setCurrentStep(2);
            return false;
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
            ...(editId ? { schedule_id: editId } : {}),
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

    useEffect(() => {
        if (!hasErrors) {
            return;
        }

        $("#roomScheduleModal").modal("show");
        setCurrentStep(getErrorStep(errors));
    }, [errors, hasErrors]);

    useEffect(() => {
        if (!editId) {
            return;
        }

        $.get(route("admin.core.room-schedules.show", editId))
            .done((roomSchedule) => {
                const scheduleSubject = subjects.find(
                    (subject) => subject.id?.toString() === roomSchedule.subject_id?.toString(),
                );

                resetWizardState();
                setData({
                    academic_period_id: roomSchedule.academic_period_id?.toString() ?? "",
                    branch_id: scheduleSubject?.branch_id?.toString() ?? "",
                    department_id: scheduleSubject?.department_id?.toString() ?? "",
                    program_id: scheduleSubject?.program_id?.toString() ?? "",
                    subject_id: roomSchedule.subject_id?.toString() ?? "",
                    room_id: roomSchedule.room_id?.toString() ?? "",
                    professor_id: roomSchedule.professor_id?.toString() ?? "",
                    section: roomSchedule.section ?? "",
                    day_of_week: roomSchedule.day_of_week ?? "",
                    start_time: roomSchedule.start_time ?? "",
                    end_time: roomSchedule.end_time ?? "",
                    notes: roomSchedule.notes ?? "",
                });
            })
            .fail(() => {
                toastr.error("Failed to load room schedule details.");
            });
    }, [editId, subjects]);

    useEffect(() => {
        const $modal = $("#roomScheduleModal");
        const handleHidden = () => {
            setData(getInitialValues(currentAcademicPeriodId));
            clearErrors();
            resetWizardState();
        };

        $modal.on("hidden.bs.modal", handleHidden);

        return () => {
            $modal.off("hidden.bs.modal", handleHidden);
        };
    }, [clearErrors, currentAcademicPeriodId, setData]);

    useEffect(() => {
        if (currentStep !== 2 || !canLoadAvailability) {
            return;
        }

        loadAvailableRooms();
    }, [availabilityKey, currentStep]);

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
            return;
        }

        const options = {
            onSuccess: () => {
                setData(getInitialValues(currentAcademicPeriodId));
                $("#roomScheduleModal").modal("hide");
                toastr.success(
                    isEditing
                        ? "Room schedule updated successfully."
                        : "Room schedule created successfully.",
                );

                if (onSuccess) {
                    onSuccess();
                }
            },
        };

        if (isEditing) {
            put(route("admin.core.room-schedules.update", editId), options);
            return;
        }

        post(route("admin.core.room-schedules.store"), options);
    };

    const handleNextStep = () => {
        if (!validateStep(currentStep)) {
            return;
        }

        setCurrentStep((step) => Math.min(step + 1, WIZARD_STEPS.length - 1));
    };

    const summaryCard = (
        <div className="card shadow-none room-schedule-summary-card h-100">
            <div className="card-body d-flex flex-column gap-3">
                <div>
                    <h6 className="card-title mb-1">Schedule Summary</h6>
                    <p className="text-muted small mb-0">
                        This snapshot updates as you move through the wizard.
                    </p>
                </div>

                <SummaryItem
                    label="Academic Period"
                    value={formatAcademicPeriod(selectedAcademicPeriod)}
                />
                <SummaryItem label="Branch" value={selectedBranch?.name} />
                <SummaryItem
                    label="Department"
                    value={selectedDepartment ? `${selectedDepartment.code} - ${selectedDepartment.name}` : ""}
                />
                <SummaryItem
                    label="Program"
                    value={selectedProgram ? `${selectedProgram.code} - ${selectedProgram.name}` : ""}
                />
                <SummaryItem
                    label="Subject"
                    value={selectedSubject ? `${selectedSubject.code} - ${selectedSubject.name}` : ""}
                />
                <SummaryItem label="Section" value={data.section} />
                <SummaryItem label="Professor" value={selectedProfessor?.name} />
                <SummaryItem
                    label="Schedule"
                    value={
                        data.day_of_week && data.start_time && data.end_time
                            ? `${dayLabels[data.day_of_week] ?? data.day_of_week}, ${formatTime(data.start_time)} - ${formatTime(data.end_time)}`
                            : ""
                    }
                />
                <SummaryItem
                    label="Selected Room"
                    value={selectedRoom ? `${selectedRoom.code}` : ""}
                />
            </div>
        </div>
    );

    return (
        <ModalForm
            id="roomScheduleModal"
            title={isEditing ? "Edit Room Schedule" : "Add Room Schedule"}
            subtitle="Use the wizard to place each class into the right branch, time slot, and available room."
            formId="room-schedule-form"
            onSubmit={handleSubmit}
            footer={(
                <div className="w-100 d-flex flex-wrap justify-content-between align-items-center gap-2">
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
                        {currentStep < WIZARD_STEPS.length - 1 ? (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleNextStep}
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
            )}
        >
            <WizardSteps
                steps={WIZARD_STEPS}
                currentStep={currentStep}
                onStepChange={setCurrentStep}
                canNavigateToStep={canNavigateToStep}
            />

            {currentStep === 0 && (
                <>

                    <div className="row g-4">
                        <div className="col-lg-8">
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
                            <SelectField
                                id="schedule-branch"
                                label="Branch"
                                name="branch_id"
                                placeholder="Select a branch"
                                value={data.branch_id}
                                onChange={(val) => {
                                    clearErrors("branch_id");
                                    clearErrors("department_id");
                                    clearErrors("program_id");
                                    clearErrors("subject_id");
                                    clearErrors("room_id");
                                    setData((current) => ({
                                        ...current,
                                        branch_id: val,
                                        department_id: "",
                                        program_id: "",
                                        subject_id: "",
                                        room_id: "",
                                    }));
                                    resetAvailabilityState();
                                }}
                                options={branches}
                                dropdownParent="#roomScheduleModal"
                                error={errors.branch_id}
                                help="Choose the branch first so the rest of the academic hierarchy stays accurate."
                            />

                            <SelectField
                                id="schedule-department"
                                label="Department"
                                name="department_id"
                                placeholder={data.branch_id ? "Select a department" : "Select a branch first"}
                                value={data.department_id}
                                onChange={(val) => {
                                    clearErrors("department_id");
                                    clearErrors("program_id");
                                    clearErrors("subject_id");
                                    clearErrors("room_id");
                                    setData((current) => ({
                                        ...current,
                                        department_id: val,
                                        program_id: "",
                                        subject_id: "",
                                        room_id: "",
                                    }));
                                    resetAvailabilityState();
                                }}
                                options={filteredDepartments}
                                renderOption={(department) => `${department.code} - ${department.name}`}
                                dropdownParent="#roomScheduleModal"
                                error={errors.department_id}
                                help={data.branch_id
                                    ? "No departments found for the selected branch."
                                    : "Select a branch first before choosing a department."}
                                disabled={!data.branch_id}
                            />

                            <SelectField
                                id="schedule-program"
                                label="Program"
                                name="program_id"
                                placeholder={data.department_id ? "Select a program" : "Select a department first"}
                                value={data.program_id}
                                onChange={(val) => {
                                    clearErrors("program_id");
                                    clearErrors("subject_id");
                                    clearErrors("room_id");
                                    setData((current) => ({
                                        ...current,
                                        program_id: val,
                                        subject_id: "",
                                        room_id: "",
                                    }));
                                    resetAvailabilityState();
                                }}
                                options={filteredPrograms}
                                renderOption={(program) => `${program.code} - ${program.name}`}
                                dropdownParent="#roomScheduleModal"
                                error={errors.program_id}
                                help={data.department_id
                                    ? "No programs found for the selected department."
                                    : "Select a department first before choosing a program."}
                                disabled={!data.department_id}
                            />

                            <SelectField
                                id="schedule-subject"
                                label="Subject"
                                name="subject_id"
                                placeholder={data.program_id ? "Select a subject" : "Select a program first"}
                                value={data.subject_id}
                                onChange={(val) => {
                                    clearErrors("subject_id");
                                    clearErrors("room_id");
                                    setData((current) => ({
                                        ...current,
                                        subject_id: val,
                                        room_id: "",
                                    }));
                                    resetAvailabilityState();
                                }}
                                options={filteredSubjects}
                                renderOption={(subject) => `${subject.code} - ${subject.name}`}
                                dropdownParent="#roomScheduleModal"
                                error={errors.subject_id}
                                help={data.program_id
                                    ? "No subjects found for the selected program."
                                    : "Select a program first before choosing a subject."}
                                disabled={!data.program_id}
                            />
                        </div>

                        <div className="col-lg-4">
                            {summaryCard}
                        </div>
                    </div>
                </>
            )}

            {currentStep === 1 && (
                <div className="row g-4">
                    <div className="col-lg-8">
                        <div className="alert alert-primary d-flex align-items-start gap-2" role="alert">
                            <i className="bx bx-info-circle fs-5 mt-1"></i>
                            <div>
                                Rooms on the next step will be filtered using the chosen branch, day, and time window.
                            </div>
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
                                        clearErrors("room_id");
                                        setData("section", event.target.value.toUpperCase());
                                    }}
                                    error={errors.section}
                                    help="Use the section name students will recognize."
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
                                    dropdownParent="#roomScheduleModal"
                                    error={errors.professor_id}
                                    help="Create a professor first in Utilities if the person is not listed yet."
                                />
                            </div>
                        </div>

                        <SelectField
                            id="schedule-day"
                            label="Day"
                            name="day_of_week"
                            placeholder="Select a day"
                            value={data.day_of_week}
                            onChange={(val) => {
                                clearErrors("day_of_week");
                                clearErrors("room_id");
                                setData((current) => ({
                                    ...current,
                                    day_of_week: val,
                                    room_id: "",
                                }));
                                resetAvailabilityState();
                            }}
                            options={dayOptions}
                            dropdownParent="#roomScheduleModal"
                            error={errors.day_of_week}
                        />

                        <div className="row">
                            <div className="col-md-6">
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
                                />
                            </div>

                            <div className="col-md-6">
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
                                />
                            </div>
                        </div>

                        <div className="mb-3">
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
                    </div>

                    <div className="col-lg-4">
                        {summaryCard}
                    </div>
                </div>
            )}

            {currentStep === 2 && (
                <div className="row g-4">
                    <div className="col-lg-8">
                        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                            <div>
                                <h6 className="mb-1">Available Rooms</h6>
                                <p className="text-muted mb-0">
                                    Showing rooms that are open for{" "}
                                    <span className="fw-semibold">
                                        {selectedBranch?.name || "the selected branch"}
                                    </span>{" "}
                                    on{" "}
                                    <span className="fw-semibold">
                                        {dayLabels[data.day_of_week] ?? "the selected day"}
                                    </span>{" "}
                                    from{" "}
                                    <span className="fw-semibold">
                                        {formatTime(data.start_time)}
                                    </span>{" "}
                                    to{" "}
                                    <span className="fw-semibold">
                                        {formatTime(data.end_time)}
                                    </span>.
                                </p>
                            </div>

                            <div className="d-flex align-items-center gap-2">
                                <span className="badge bg-label-primary">
                                    {availabilityMeta.available_count} available
                                </span>
                                <span className="badge bg-label-secondary">
                                    {availabilityMeta.total_rooms} in branch
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={loadAvailableRooms}
                                    disabled={loadingAvailableRooms || !canLoadAvailability}
                                >
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {(loadingAvailableRooms || availabilityStatus === "idle") && (
                            <div className="border rounded-4 p-4 text-center">
                                <div className="spinner-border text-primary mb-3" role="status" aria-hidden="true"></div>
                                <div className="fw-semibold">
                                    {loadingAvailableRooms ? "Checking room availability..." : "Preparing room availability check..."}
                                </div>
                                <div className="text-muted small mt-1">
                                    This checks the selected branch and time slot against saved schedules.
                                </div>
                            </div>
                        )}

                        {!loadingAvailableRooms && availabilityStatus === "error" && availabilityError && (
                            <div className="alert alert-danger" role="alert">
                                {availabilityError}
                            </div>
                        )}

                        {!loadingAvailableRooms && availabilityStatus === "success" && !availabilityError && availableRooms.length === 0 && (
                            <div className="alert alert-warning" role="alert">
                                {availabilityMeta.total_rooms === 0
                                    ? "No rooms are registered yet for this branch. Add rooms first in Utilities > Room."
                                    : "No rooms are currently available for that branch, day, and time range. Try another schedule window."}
                            </div>
                        )}

                        {!loadingAvailableRooms && availabilityStatus === "success" && !availabilityError && availableRooms.length > 0 && (
                            <div className="row g-3">
                                {availableRooms.map((room) => (
                                    <div className="col-md-6" key={room.id}>
                                        <RoomOptionCard
                                            room={room}
                                            selected={room.id?.toString() === data.room_id?.toString()}
                                            onSelect={(roomId) => {
                                                clearErrors("room_id");
                                                setData("room_id", roomId?.toString());
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {errors.room_id && (
                            <div className="invalid-feedback d-block mt-3">
                                {errors.room_id}
                            </div>
                        )}
                    </div>

                    <div className="col-lg-4">
                        {summaryCard}
                    </div>
                </div>
            )}
        </ModalForm>
    );
}
