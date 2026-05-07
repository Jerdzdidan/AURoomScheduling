import { useMemo } from "react";
import SelectField from "@/Components/Input/SelectField";

export default function FilterRoomOffcanvas({
    filters,
    setFilters,
    branches,
    buildings,
    departments,
    onApply,
}) {
    const filteredBuildings = useMemo(() => {
        if (!filters.branch_id) {
            return [];
        }

        return buildings.filter(
            (building) => building.branch_id?.toString() === filters.branch_id?.toString(),
        );
    }, [buildings, filters.branch_id]);

    const filteredDepartments = useMemo(() => {
        if (!filters.branch_id) {
            return [];
        }

        return departments.filter(
            (department) => department.branch_id?.toString() === filters.branch_id?.toString(),
        );
    }, [departments, filters.branch_id]);

    const handleApply = () => {
        onApply();
        $("#filterRoomOffcanvas").offcanvas("hide");
    };

    const handleClear = () => {
        const cleared = {
            branch_id: "",
            building_id: "",
            room_type: "",
            department_id: "",
        };

        setFilters(cleared);
        onApply(cleared);
        $("#filterRoomOffcanvas").offcanvas("hide");
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            id="filterRoomOffcanvas"
            tabIndex="-1"
            aria-labelledby="filterRoomOffcanvasLabel"
        >
            <div className="offcanvas-header border-bottom">
                <h5 className="offcanvas-title" id="filterRoomOffcanvasLabel">
                    Filter Rooms
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
                    id="filter-room-branch"
                    label="Branch"
                    name="branch_id"
                    placeholder="All branches"
                    value={filters.branch_id}
                    onChange={(value) =>
                        setFilters((current) => ({
                            ...current,
                            branch_id: value,
                            building_id: "",
                            department_id: "",
                        }))
                    }
                    options={branches}
                    dropdownParent="#filterRoomOffcanvas"
                />

                <SelectField
                    id="filter-room-building"
                    label="Building"
                    name="building_id"
                    placeholder={filters.branch_id ? "All buildings" : "Select a branch first"}
                    value={filters.building_id}
                    onChange={(value) =>
                        setFilters((current) => ({
                            ...current,
                            building_id: value,
                        }))
                    }
                    options={filteredBuildings}
                    renderOption={(building) => `${building.code} - ${building.name}`}
                    dropdownParent="#filterRoomOffcanvas"
                    disabled={!filters.branch_id}
                />

                <SelectField
                    id="filter-room-type"
                    label="Room Type"
                    name="room_type"
                    placeholder="All room types"
                    value={filters.room_type}
                    onChange={(value) =>
                        setFilters((current) => ({
                            ...current,
                            room_type: value,
                        }))
                    }
                    options={[
                        { id: 'Lec Room', name: 'Lec Room' },
                        { id: 'Lab Room', name: 'Lab Room' },
                    ]}
                    dropdownParent="#filterRoomOffcanvas"
                />

                <SelectField
                    id="filter-room-department"
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
                    dropdownParent="#filterRoomOffcanvas"
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
