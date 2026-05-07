import { useMemo } from "react";
import SelectField from "@/Components/Input/SelectField";

export default function FilterUserOffcanvas({
    filters,
    setFilters,
    branches,
    departments,
    onApply,
}) {
    const filteredDepartments = useMemo(() => {
        if (!filters.branch_id) {
            return departments;
        }

        return departments.filter(
            (department) => department.branch_id?.toString() === filters.branch_id?.toString(),
        );
    }, [departments, filters.branch_id]);

    const handleApply = () => {
        onApply();
        $("#filterUserOffcanvas").offcanvas("hide");
    };

    const handleClear = () => {
        const cleared = {
            user_type: "",
            status: "",
            branch_id: "",
            department_id: "",
        };

        setFilters(cleared);
        onApply(cleared);
        $("#filterUserOffcanvas").offcanvas("hide");
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            id="filterUserOffcanvas"
            tabIndex="-1"
            aria-labelledby="filterUserOffcanvasLabel"
        >
            <div className="offcanvas-header border-bottom">
                <h5 className="offcanvas-title" id="filterUserOffcanvasLabel">
                    Filter Users
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
                    id="filter-user-type"
                    label="User Type"
                    name="user_type"
                    placeholder="All types"
                    value={filters.user_type}
                    onChange={(value) =>
                        setFilters((current) => ({
                            ...current,
                            user_type: value,
                            ...(value !== "OFFICER" ? { branch_id: "", department_id: "" } : {}),
                        }))
                    }
                    options={[
                        { id: 'ADMIN', name: 'ADMIN' },
                        { id: 'OFFICER', name: 'OFFICER' },
                    ]}
                    dropdownParent="#filterUserOffcanvas"
                />

                <SelectField
                    id="filter-user-status"
                    label="Status"
                    name="status"
                    placeholder="All statuses"
                    value={filters.status}
                    onChange={(value) =>
                        setFilters((current) => ({
                            ...current,
                            status: value,
                        }))
                    }
                    options={[
                        { id: '1', name: 'Active' },
                        { id: '0', name: 'Inactive' },
                    ]}
                    dropdownParent="#filterUserOffcanvas"
                />

                <SelectField
                    id="filter-user-branch"
                    label="Branch"
                    name="branch_id"
                    placeholder={filters.user_type === "OFFICER" ? "All branches" : "Select 'OFFICER' user type first"}
                    value={filters.branch_id}
                    onChange={(value) =>
                        setFilters((current) => ({
                            ...current,
                            branch_id: value,
                            department_id: "",
                        }))
                    }
                    options={branches}
                    dropdownParent="#filterUserOffcanvas"
                    disabled={filters.user_type !== "OFFICER"}
                />

                <SelectField
                    id="filter-user-department"
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
                    dropdownParent="#filterUserOffcanvas"
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
