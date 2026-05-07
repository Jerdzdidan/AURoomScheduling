import SelectField from "@/Components/Input/SelectField";

export default function FilterDepartmentOffcanvas({
    filters,
    setFilters,
    branches,
    onApply,
}) {
    const handleApply = () => {
        onApply();
        $("#filterDepartmentOffcanvas").offcanvas("hide");
    };

    const handleClear = () => {
        const cleared = {
            branch_id: "",
        };

        setFilters(cleared);
        onApply(cleared);
        $("#filterDepartmentOffcanvas").offcanvas("hide");
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            id="filterDepartmentOffcanvas"
            tabIndex="-1"
            aria-labelledby="filterDepartmentOffcanvasLabel"
        >
            <div className="offcanvas-header border-bottom">
                <h5 className="offcanvas-title" id="filterDepartmentOffcanvasLabel">
                    Filter Departments
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
                    id="filter-department-branch"
                    label="Branch"
                    name="branch_id"
                    placeholder="All branches"
                    value={filters.branch_id}
                    onChange={(value) =>
                        setFilters((current) => ({
                            ...current,
                            branch_id: value,
                        }))
                    }
                    options={branches}
                    dropdownParent="#filterDepartmentOffcanvas"
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
