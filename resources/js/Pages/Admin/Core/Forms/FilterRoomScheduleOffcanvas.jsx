import { useMemo } from "react";
import SelectField from "@/Components/Input/SelectField";

export default function FilterRoomScheduleOffcanvas({
    filters,
    setFilters,
    academicPeriods,
    branches,
    departments,
    subjects,
    rooms,
    dayOptions,
    onApply,
}) {
    const filteredDepartments = useMemo(() => {
        if (!filters.branch_id) {
            return [];
        }

        return departments.filter(
            (department) => department.branch_id?.toString() === filters.branch_id?.toString(),
        );
    }, [departments, filters.branch_id]);

    const filteredSubjects = useMemo(() => {
        if (!filters.department_id) {
            return [];
        }

        return subjects.filter(
            (subject) => subject.department_id?.toString() === filters.department_id?.toString(),
        );
    }, [subjects, filters.department_id]);

    const filteredRooms = useMemo(() => {
        if (!filters.branch_id) {
            return [];
        }

        return rooms.filter((room) => {
            if (room.branch_id?.toString() !== filters.branch_id?.toString()) {
                return false;
            }

            if (!filters.department_id) {
                return true;
            }

            return (room.department_ids ?? []).includes(filters.department_id?.toString());
        });
    }, [rooms, filters.branch_id, filters.department_id]);

    const handleApply = () => {
        onApply();
        $("#filterRoomScheduleOffcanvas").offcanvas("hide");
    };

    const handleClear = () => {
        const cleared = {
            academic_period_id: "",
            branch_id: "",
            department_id: "",
            subject_id: "",
            day_of_week: "",
            room_id: "",
        };

        setFilters(cleared);
        onApply(cleared);
        $("#filterRoomScheduleOffcanvas").offcanvas("hide");
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            id="filterRoomScheduleOffcanvas"
            tabIndex="-1"
            aria-labelledby="filterRoomScheduleOffcanvasLabel"
        >
            <div className="offcanvas-header border-bottom">
                <h5 className="offcanvas-title" id="filterRoomScheduleOffcanvasLabel">
                    Filter Room Schedules
                </h5>
                <button
                    type="button"
                    className="btn-close text-reset"
                    data-bs-dismiss="offcanvas"
                    aria-label="Close"
                />
            </div>

            <div className="offcanvas-body flex-grow-1">
                <SelectField
                    id="filter-schedule-academic-period"
                    label="Academic Period"
                    name="academic_period_id"
                    placeholder="All academic periods"
                    value={filters.academic_period_id}
                    onChange={(value) =>
                        setFilters((current) => ({
                            ...current,
                            academic_period_id: value,
                        }))
                    }
                    options={academicPeriods}
                    dropdownParent="#filterRoomScheduleOffcanvas"
                />

                <SelectField
                    id="filter-schedule-branch"
                    label="Branch"
                    name="branch_id"
                    placeholder="All branches"
                    value={filters.branch_id}
                    onChange={(value) =>
                        setFilters((current) => ({
                            ...current,
                            branch_id: value,
                            department_id: "",
                            subject_id: "",
                            room_id: "",
                        }))
                    }
                    options={branches}
                    dropdownParent="#filterRoomScheduleOffcanvas"
                />

                <SelectField
                    id="filter-schedule-department"
                    label="Department"
                    name="department_id"
                    placeholder={filters.branch_id ? "All departments" : "Select a branch first"}
                    value={filters.department_id}
                    onChange={(value) =>
                        setFilters((current) => ({
                            ...current,
                            department_id: value,
                            subject_id: "",
                            room_id: "",
                        }))
                    }
                    options={filteredDepartments}
                    renderOption={(department) => `${department.code} - ${department.name}`}
                    dropdownParent="#filterRoomScheduleOffcanvas"
                    disabled={!filters.branch_id}
                />

                <SelectField
                    id="filter-schedule-subject"
                    label="Subject"
                    name="subject_id"
                    placeholder={filters.department_id ? "All subjects" : "Select a department first"}
                    value={filters.subject_id}
                    onChange={(value) =>
                        setFilters((current) => ({
                            ...current,
                            subject_id: value,
                        }))
                    }
                    options={filteredSubjects}
                    renderOption={(subject) => `${subject.code} - ${subject.name}`}
                    dropdownParent="#filterRoomScheduleOffcanvas"
                    disabled={!filters.department_id}
                />

                <SelectField
                    id="filter-schedule-day"
                    label="Day"
                    name="day_of_week"
                    placeholder="All days"
                    value={filters.day_of_week}
                    onChange={(value) =>
                        setFilters((current) => ({
                            ...current,
                            day_of_week: value,
                        }))
                    }
                    options={dayOptions}
                    dropdownParent="#filterRoomScheduleOffcanvas"
                />

                <SelectField
                    id="filter-schedule-room"
                    label="Room"
                    name="room_id"
                    placeholder={filters.branch_id ? "All rooms" : "Select a branch first"}
                    value={filters.room_id}
                    onChange={(value) =>
                        setFilters((current) => ({
                            ...current,
                            room_id: value,
                        }))
                    }
                    options={filteredRooms}
                    renderOption={(room) => `${room.code} - ${room.building_code} - ${room.building_name}`}
                    dropdownParent="#filterRoomScheduleOffcanvas"
                    disabled={!filters.branch_id}
                />

                <div className="pt-2">
                    <div className="d-flex gap-2">
                        <button
                            type="button"
                            className="btn btn-primary flex-fill"
                            onClick={handleApply}
                        >
                            <i className="icon-base bx bx-check me-1"></i>
                            Apply Filters
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-secondary flex-fill"
                            onClick={handleClear}
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
