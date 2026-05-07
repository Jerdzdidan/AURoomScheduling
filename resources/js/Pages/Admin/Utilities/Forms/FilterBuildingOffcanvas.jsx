import SelectField from "@/Components/Input/SelectField";

export default function FilterBuildingOffcanvas({
    filters,
    setFilters,
    branches,
    onApply,
}) {
    const handleApply = () => {
        onApply();
        $("#filterBuildingOffcanvas").offcanvas("hide");
    };

    const handleClear = () => {
        const cleared = {
            branch_id: "",
        };

        setFilters(cleared);
        onApply(cleared);
        $("#filterBuildingOffcanvas").offcanvas("hide");
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            id="filterBuildingOffcanvas"
            tabIndex="-1"
            aria-labelledby="filterBuildingOffcanvasLabel"
        >
            <div className="offcanvas-header border-bottom">
                <h5 className="offcanvas-title" id="filterBuildingOffcanvasLabel">
                    Filter Buildings
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
                    id="filter-building-branch"
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
                    dropdownParent="#filterBuildingOffcanvas"
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
