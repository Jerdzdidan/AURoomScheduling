import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import OffcanvasForm from '@/Components/Form/OffcanvasForm';
import InputField from '@/Components/Input/InputField';
import SelectField from '@/Components/Input/SelectField';

const initialValues = {
    name: '',
    code: '',
    branch_id: '',
};

export default function CreateAndEditDepartment({ editId, branches, onSuccess }) {
    const isEditing = !!editId;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(initialValues);

    useEffect(() => {
        if (!editId) {
            reset();
            clearErrors();
            return;
        }

        $.get(route('admin.utilities.departments.show', editId))
            .done((department) => {
                setData({
                    name: department.name ?? '',
                    code: department.code ?? '',
                    branch_id: department.branch_id?.toString() ?? '',
                });
            })
            .fail(() => {
                toastr.error('Failed to load department details.');
            });
    }, [editId]);

    useEffect(() => {
        const $offcanvas = $('#departmentOffcanvas');

        $offcanvas.on('hidden.bs.offcanvas', () => {
            reset();
            clearErrors();
        });

        return () => $offcanvas.off('hidden.bs.offcanvas');
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                reset();
                $('#departmentOffcanvas').offcanvas('hide');
                toastr.success(
                    isEditing
                        ? 'Department updated successfully.'
                        : 'Department created successfully.'
                );

                if (onSuccess) {
                    onSuccess();
                }
            },
        };

        if (isEditing) {
            put(route('admin.utilities.departments.update', editId), options);
            return;
        }

        post(route('admin.utilities.departments.store'), options);
    };

    return (
        <OffcanvasForm
            id="departmentOffcanvas"
            title={isEditing ? 'Edit Department' : 'Add New Department'}
            formId="department-form"
            onSubmit={handleSubmit}
            submitButtonName={processing ? 'Saving...' : (isEditing ? 'Update' : 'Submit')}
        >
            <InputField
                id="department-name"
                label="Department Name"
                name="name"
                icon="bx bx-buildings"
                placeholder="School of Computer Studies"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                error={errors.name}
                required
            />

            <InputField
                id="department-code"
                label="Department Code"
                name="code"
                icon="bx bx-purchase-tag"
                placeholder="SCS"
                value={data.code}
                onChange={(e) => setData('code', e.target.value.toUpperCase())}
                error={errors.code}
                required
            />

            <SelectField
                id="department-branch"
                label="Branch"
                name="branch_id"
                placeholder="Select a branch"
                value={data.branch_id}
                onChange={(val) => setData('branch_id', val)}
                options={branches}
                dropdownParent="#departmentOffcanvas"
                error={errors.branch_id}
                help="Create a branch first before adding a department."
                required
            />
        </OffcanvasForm>
    );
}
