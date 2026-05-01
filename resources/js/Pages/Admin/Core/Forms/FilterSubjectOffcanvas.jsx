import { useMemo } from 'react';
import SelectField from '@/Components/Input/SelectField';

export default function FilterSubjectOffcanvas({
    filters,
    setFilters,
    branches,
    departments,
    subjectTypeOptions,
    classTypeOptions,
    onApply,
}) {
    const filteredDepartments = useMemo(() => {
        if (!filters.branch_id) return [];

        return departments.filter(
            (department) => department.branch_id?.toString() === filters.branch_id?.toString()
        );
    }, [departments, filters.branch_id]);

    const handleApply = () => {
        onApply();
        $('#filterSubjectOffcanvas').offcanvas('hide');
    };

    const handleClear = () => {
        const cleared = {
            branch_id: '',
            department_id: '',
            subject_type: '',
            class_type: '',
        };

        setFilters(cleared);
        onApply(cleared);
        $('#filterSubjectOffcanvas').offcanvas('hide');
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            id="filterSubjectOffcanvas"
            tabIndex="-1"
            aria-labelledby="filterSubjectOffcanvasLabel"
        >
            <div className="offcanvas-header border-bottom">
                <h5 className="offcanvas-title" id="filterSubjectOffcanvasLabel">
                    Filter Subjects
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
                    id="filter-branch"
                    label="Branch"
                    name="branch_id"
                    placeholder="All branches"
                    value={filters.branch_id}
                    onChange={(val) =>
                        setFilters((prev) => ({
                            ...prev,
                            branch_id: val,
                            department_id: '',
                        }))
                    }
                    options={branches}
                    dropdownParent="#filterSubjectOffcanvas"
                />

                <SelectField
                    id="filter-department"
                    label="Department"
                    name="department_id"
                    placeholder={filters.branch_id ? 'All departments' : 'Select a branch first'}
                    value={filters.department_id}
                    onChange={(val) =>
                        setFilters((prev) => ({
                            ...prev,
                            department_id: val,
                        }))
                    }
                    options={filteredDepartments}
                    renderOption={(department) => `${department.code} - ${department.name}`}
                    dropdownParent="#filterSubjectOffcanvas"
                    disabled={!filters.branch_id}
                />

                <SelectField
                    id="filter-subject-type"
                    label="Subject Type"
                    name="subject_type"
                    placeholder="All types"
                    value={filters.subject_type}
                    onChange={(val) =>
                        setFilters((prev) => ({ ...prev, subject_type: val }))
                    }
                    options={subjectTypeOptions}
                    dropdownParent="#filterSubjectOffcanvas"
                />

                <SelectField
                    id="filter-class-type"
                    label="Class Type"
                    name="class_type"
                    placeholder="All types"
                    value={filters.class_type}
                    onChange={(val) =>
                        setFilters((prev) => ({ ...prev, class_type: val }))
                    }
                    options={classTypeOptions}
                    dropdownParent="#filterSubjectOffcanvas"
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
