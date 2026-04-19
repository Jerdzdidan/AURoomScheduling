import { useForm } from "@inertiajs/react";
import { useEffect, useMemo } from "react";
import OffcanvasForm from "@/Components/Form/OffcanvasForm";
import InputField from "@/Components/Input/InputField";
import SelectField from "@/Components/Input/SelectField";

const getInitialValues = (currentAcademicPeriodId) => ({
    academic_period_id: currentAcademicPeriodId?.toString() ?? "",
    branch_id: "",
    department_id: "",
    program_id: "",
    subject_id: "",
    room_id: "",
    section: "",
    day_of_week: "",
    start_time: "",
    end_time: "",
    professor_name: "",
    notes: "",
});

export default function CreateAndEditRoomSchedule({
    editId,
    academicPeriods,
    branches,
    departments,
    programs,
    subjects,
    rooms,
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
    } = useForm("roomScheduleForm", getInitialValues(currentAcademicPeriodId));
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

    useEffect(() => {
        if (hasErrors) {
            $("#roomScheduleOffcanvas").offcanvas("show");
            return;
        }

        if (!editId) {
            return;
        }

        $.get(route("admin.core.room-schedules.show", editId))
            .done((roomSchedule) => {
                const selectedSubject = subjects.find(
                    (subject) => subject.id?.toString() === roomSchedule.subject_id?.toString()
                );

                setData({
                    academic_period_id: roomSchedule.academic_period_id?.toString() ?? "",
                    branch_id: selectedSubject?.branch_id?.toString() ?? "",
                    department_id: selectedSubject?.department_id?.toString() ?? "",
                    program_id: selectedSubject?.program_id?.toString() ?? "",
                    subject_id: roomSchedule.subject_id?.toString() ?? "",
                    room_id: roomSchedule.room_id?.toString() ?? "",
                    section: roomSchedule.section ?? "",
                    day_of_week: roomSchedule.day_of_week ?? "",
                    start_time: roomSchedule.start_time ?? "",
                    end_time: roomSchedule.end_time ?? "",
                    professor_name: roomSchedule.professor_name ?? "",
                    notes: roomSchedule.notes ?? "",
                });
            })
            .fail(() => {
                toastr.error("Failed to load room schedule details.");
            });
    }, [editId, currentAcademicPeriodId, subjects, setData, hasErrors]);

    useEffect(() => {
        const $offcanvas = $("#roomScheduleOffcanvas");

        $offcanvas.on("hidden.bs.offcanvas", () => {
            setData(getInitialValues(currentAcademicPeriodId));
            clearErrors();
        });

        return () => $offcanvas.off("hidden.bs.offcanvas");
    }, [currentAcademicPeriodId, clearErrors, setData]);

    const handleSubmit = (e) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                setData(getInitialValues(currentAcademicPeriodId));
                $("#roomScheduleOffcanvas").offcanvas("hide");
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

    return (
        <OffcanvasForm
            id="roomScheduleOffcanvas"
            title={isEditing ? "Edit Room Schedule" : "Add Room Schedule"}
            formId="room-schedule-form"
            onSubmit={handleSubmit}
            submitButtonName={processing ? "Saving..." : (isEditing ? "Update" : "Submit")}
        >
            <div className="alert alert-primary" role="alert">
                Room conflicts are checked automatically before a schedule is saved.
            </div>

            <SelectField
                id="schedule-academic-period"
                label="Academic Period"
                name="academic_period_id"
                placeholder="Select an academic period"
                value={data.academic_period_id}
                onChange={(val) => setData("academic_period_id", val)}
                options={academicPeriods}
                dropdownParent="#roomScheduleOffcanvas"
                error={errors.academic_period_id}
                help="Create an academic period first before adding schedules."
            />

            <SelectField
                id="schedule-branch"
                label="Branch"
                name="branch_id"
                placeholder="Select a branch"
                value={data.branch_id}
                onChange={(val) => {
                    setData((current) => ({
                        ...current,
                        branch_id: val,
                        department_id: "",
                        program_id: "",
                        subject_id: "",
                    }));
                }}
                options={branches}
                dropdownParent="#roomScheduleOffcanvas"
                error={errors.branch_id}
                help="Create a branch first before choosing a subject."
            />

            <SelectField
                id="schedule-department"
                label="Department"
                name="department_id"
                placeholder={data.branch_id ? "Select a department" : "Select a branch first"}
                value={data.department_id}
                onChange={(val) => {
                    setData((current) => ({
                        ...current,
                        department_id: val,
                        program_id: "",
                        subject_id: "",
                    }));
                }}
                options={filteredDepartments}
                renderOption={(department) => `${department.code} - ${department.name}`}
                dropdownParent="#roomScheduleOffcanvas"
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
                    setData((current) => ({
                        ...current,
                        program_id: val,
                        subject_id: "",
                    }));
                }}
                options={filteredPrograms}
                renderOption={(program) => `${program.code} - ${program.name}`}
                dropdownParent="#roomScheduleOffcanvas"
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
                onChange={(val) => setData("subject_id", val)}
                options={filteredSubjects}
                renderOption={(subject) => `${subject.code} - ${subject.name}`}
                dropdownParent="#roomScheduleOffcanvas"
                error={errors.subject_id}
                help={data.program_id
                    ? "No subjects found for the selected program."
                    : "Select a program first before choosing a subject."}
                disabled={!data.program_id}
            />

            <InputField
                id="schedule-section"
                label="Section"
                name="section"
                icon="bx bx-grid-alt"
                placeholder="BSIT-1A"
                value={data.section}
                onChange={(e) => setData("section", e.target.value.toUpperCase())}
                error={errors.section}
            />

            <SelectField
                id="schedule-room"
                label="Room"
                name="room_id"
                placeholder="Select a room"
                value={data.room_id}
                onChange={(val) => setData("room_id", val)}
                options={rooms}
                renderOption={(room) => `${room.code} (${room.type})`}
                dropdownParent="#roomScheduleOffcanvas"
                error={errors.room_id}
                help="Create a room first before adding schedules."
            />

            <SelectField
                id="schedule-day"
                label="Day"
                name="day_of_week"
                placeholder="Select a day"
                value={data.day_of_week}
                onChange={(val) => setData("day_of_week", val)}
                options={dayOptions}
                dropdownParent="#roomScheduleOffcanvas"
                error={errors.day_of_week}
            />

            <div className="row">
                <div className="col-md-6">
                    <InputField
                        id="schedule-start-time"
                        label="Start Time"
                        type="time"
                        name="start_time"
                        icon="bx bx-time-five"
                        value={data.start_time}
                        onChange={(e) => setData("start_time", e.target.value)}
                        error={errors.start_time}
                    />
                </div>

                <div className="col-md-6">
                    <InputField
                        id="schedule-end-time"
                        label="End Time"
                        type="time"
                        name="end_time"
                        icon="bx bx-timer"
                        value={data.end_time}
                        onChange={(e) => setData("end_time", e.target.value)}
                        error={errors.end_time}
                    />
                </div>
            </div>

            <InputField
                id="schedule-professor"
                label="Professor"
                name="professor_name"
                icon="bx bx-user"
                placeholder="Prof. Maria Santos"
                value={data.professor_name}
                onChange={(e) => setData("professor_name", e.target.value)}
                error={errors.professor_name}
            />

            <div className="mb-3">
                <label className="form-label" htmlFor="schedule-notes">Notes</label>
                <textarea
                    id="schedule-notes"
                    name="notes"
                    className="form-control"
                    rows="3"
                    placeholder="Optional notes about this schedule"
                    value={data.notes}
                    onChange={(e) => setData("notes", e.target.value)}
                    style={errors.notes ? { borderColor: "#fc4225" } : {}}
                />
                {errors.notes && <div className="invalid-feedback d-block">{errors.notes}</div>}
            </div>
        </OffcanvasForm>
    );
}
