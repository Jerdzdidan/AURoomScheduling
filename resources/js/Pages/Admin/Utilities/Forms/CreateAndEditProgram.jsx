import { useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import OffcanvasForm from '@/Components/Form/OffcanvasForm';
import InputField from '@/Components/Input/InputField';
import SelectField from '@/Components/Input/SelectField';

const getInitialValues = () => ({
    branch_id: '',
    name: '',
    code: '',
    description: '',
    department_id: '',
});

export default function CreateAndEditProgram({ editId, branches, departments, onSuccess }) {
    const isEditing = !!editId;
    const { data, setData, post, put, processing, errors, clearErrors } = useForm(getInitialValues());

    const filteredDepartments = useMemo(() => {
        if (!data.branch_id) {
            return [];
        }

        return departments.filter((department) => department.branch_id?.toString() === data.branch_id?.toString());
    }, [departments, data.branch_id]);

    useEffect(() => {
        if (!editId) {
            setData(getInitialValues());
            clearErrors();
            return;
        }

        $.get(route('admin.utilities.programs.show', editId))
            .done((program) => {
                const selectedDepartment = departments.find(
                    (department) => department.id?.toString() === program.department_id?.toString()
                );

                setData({
                    branch_id: selectedDepartment?.branch_id?.toString() ?? '',
                    name: program.name ?? '',
                    code: program.code ?? '',
                    description: program.description ?? '',
                    department_id: program.department_id?.toString() ?? '',
                });
            })
            .fail(() => {
                toastr.error('Failed to load program details.');
            });
    }, [editId, departments, clearErrors, setData]);

    useEffect(() => {
        const $offcanvas = $('#programOffcanvas');

        $offcanvas.on('hidden.bs.offcanvas', () => {
            setData(getInitialValues());
            clearErrors();
        });

        return () => $offcanvas.off('hidden.bs.offcanvas');
    }, [clearErrors, setData]);

    const handleSubmit = (e) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                setData(getInitialValues());
                $('#programOffcanvas').offcanvas('hide');
                toastr.success(
                    isEditing
                        ? 'Program updated successfully.'
                        : 'Program created successfully.'
                );

                if (onSuccess) {
                    onSuccess();
                }
            },
        };

        if (isEditing) {
            put(route('admin.utilities.programs.update', editId), options);
            return;
        }

        post(route('admin.utilities.programs.store'), options);
    };

    return (
        <OffcanvasForm
            id="programOffcanvas"
            title={isEditing ? 'Edit Program' : 'Add New Program'}
            formId="program-form"
            onSubmit={handleSubmit}
            submitButtonName={processing ? 'Saving...' : (isEditing ? 'Update' : 'Submit')}
        >
            <InputField
                id="program-name"
                label="Program Name"
                name="name"
                icon="bx bx-book"
                placeholder="Bachelor of Science in Computer Science"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                error={errors.name}
            />

            <InputField
                id="program-code"
                label="Program Code"
                name="code"
                icon="bx bx-purchase-tag"
                placeholder="BSCS"
                value={data.code}
                onChange={(e) => setData('code', e.target.value.toUpperCase())}
                error={errors.code}
            />

            <SelectField
                id="program-branch"
                label="Branch"
                name="branch_id"
                placeholder="Select a branch"
                value={data.branch_id}
                onChange={(val) => {
                    setData((current) => ({
                        ...current,
                        branch_id: val,
                        department_id: '',
                    }));
                }}
                options={branches}
                dropdownParent="#programOffcanvas"
                error={errors.branch_id}
                help="Create a branch first before adding a program."
            />

            <SelectField
                id="program-department"
                label="Department"
                name="department_id"
                placeholder={data.branch_id ? 'Select a department' : 'Select a branch first'}
                value={data.department_id}
                onChange={(val) => setData('department_id', val)}
                options={filteredDepartments}
                renderOption={(department) => `${department.code} - ${department.name}`}
                dropdownParent="#programOffcanvas"
                error={errors.department_id}
                help={data.branch_id
                    ? 'No departments found for the selected branch.'
                    : 'Select a branch first before choosing a department.'}
                disabled={!data.branch_id}
            />

            <div className="mb-3">
                <label className="form-label" htmlFor="program-description">Description <span className="text-muted">(Optional)</span></label>
                <textarea
                    id="program-description"
                    name="description"
                    className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                    placeholder="Brief description of the program"
                    rows="3"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                />
                {errors.description && <div className="invalid-feedback">{errors.description}</div>}
            </div>
        </OffcanvasForm>
    );
}
