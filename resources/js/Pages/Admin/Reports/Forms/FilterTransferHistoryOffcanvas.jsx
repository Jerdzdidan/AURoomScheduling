import { useMemo } from "react";
import SelectField from "@/Components/Input/SelectField";

export default function FilterTransferHistoryOffcanvas({
    filters,
    setFilters,
    branches,
    departments,
    rooms,
    adminUsers,
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

    const filteredRooms = useMemo(() => {
        if (!filters.branch_id) {
            return [];
        }

        return rooms.filter(
            (room) => room.branch_id?.toString() === filters.branch_id?.toString(),
        );
    }, [rooms, filters.branch_id]);

    const handleApply = () => {
        onApply();
        $("#filterTransferHistoryOffcanvas").offcanvas("hide");
    };

    const handleClear = () => {
        const cleared = {
            branch_id: "",
            department_id: "",
            day_of_week: "",
            room_id: "",
            user_id: "",
        };

        setFilters(cleared);
        onApply(cleared);
        $("#filterTransferHistoryOffcanvas").offcanvas("hide");
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            id="filterTransferHistoryOffcanvas"
            tabIndex="-1"
            aria-labelledby="filterTransferHistoryOffcanvasLabel"
        >
            <div className="offcanvas-header border-bottom">
                <h5 className="offcanvas-title" id="filterTransferHistoryOffcanvasLabel">
                    Filter Transfer History
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
                    id="filter-transfer-branch"
                    label="Branch"
                    name="branch_id"
                    placeholder="All branches"
                    value={filters.branch_id}
                    onChange={(value) =>
                        setFilters((current) => ({
                            ...current,
                            branch_id: value,
                            department_id: "",
                            room_id: "",
                        }))
                    }
                    options={branches}
                    dropdownParent="#filterTransferHistoryOffcanvas"
                />

                <SelectField
                    id="filter-transfer-department"
                    label="Department"
                    name="department_id"
                    placeholder={filters.branch_id ? "All departments" : "Select a branch first"}
                    value={filters.department_id}
                    onChange={(value) =>
                        setFilters((current) => ({
                            ...current,
                            department_id: value,
                        }))
                    }
                    options={filteredDepartments}
                    renderOption={(department) => `${department.code} - ${department.name}`}
                    dropdownParent="#filterTransferHistoryOffcanvas"
                    disabled={!filters.branch_id}
                />

                <SelectField
                    id="filter-transfer-day"
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
                    dropdownParent="#filterTransferHistoryOffcanvas"
                />

                <SelectField
                    id="filter-transfer-room"
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
                    renderOption={(room) => room.code}
                    dropdownParent="#filterTransferHistoryOffcanvas"
                    disabled={!filters.branch_id}
                />

                <SelectField
                    id="filter-transfer-user"
                    label="Transferred By"
                    name="user_id"
                    placeholder="All users"
                    value={filters.user_id}
                    onChange={(value) =>
                        setFilters((current) => ({
                            ...current,
                            user_id: value,
                        }))
                    }
                    options={adminUsers}
                    dropdownParent="#filterTransferHistoryOffcanvas"
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
