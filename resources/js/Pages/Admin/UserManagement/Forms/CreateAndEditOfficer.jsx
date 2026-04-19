import { useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import OffcanvasForm from '@/Components/Form/OffcanvasForm';
import InputField from '@/Components/Input/InputField';
import SelectField from '@/Components/Input/SelectField';

const getInitialValues = () => ({
    branch_id: '',
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    department_id: '',
});

export default function CreateAndEditOfficer({ editId, branches, departments, onSuccess }) {
    const isEditing = !!editId;

    const { data, setData, post, put, processing, errors, clearErrors } = useForm(getInitialValues());

    const filteredDepartments = useMemo(() => {
        if (!data.branch_id) {
            return [];
        }

        return departments.filter((department) => department.branch_id?.toString() === data.branch_id?.toString());
    }, [departments, data.branch_id]);

    // When editId changes, fetch the user data to populate the form
    useEffect(() => {
        if (!editId) {
            setData(getInitialValues());
            clearErrors();
            return;
        }

        $.get(route('admin.users.officer-accounts.show', editId))
            .done((user) => {
                const selectedDepartment = departments.find(
                    (department) => department.id?.toString() === user.department_id?.toString()
                );

                setData({
                    branch_id: selectedDepartment?.branch_id?.toString() ?? '',
                    name: user.name ?? '',
                    email: user.email ?? '',
                    password: '',
                    password_confirmation: '',
                    department_id: user.department_id?.toString() ?? '',
                });
            })
            .fail(() => {
                toastr.error('Failed to load officer details.');
            });
    }, [editId, departments, clearErrors, setData]);

    useEffect(() => {
        const $offcanvas = $('#officerOffcanvas');
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
                $('#officerOffcanvas').offcanvas('hide');
                toastr.success(
                    isEditing
                        ? 'Officer account updated successfully.'
                        : 'Officer account created successfully.'
                );
                if (onSuccess) onSuccess();
            },
        };

        if (isEditing) {
            put(route('admin.users.officer-accounts.update', editId), options);
        } else {
            post(route('admin.users.officer-accounts.store'), options);
        }
    };

    return (
        <OffcanvasForm
            id="officerOffcanvas"
            title={isEditing ? 'Edit Officer' : 'Add New Officer'}
            formId="officer-form"
            onSubmit={handleSubmit}
            submitButtonName={processing ? 'Saving...' : (isEditing ? 'Update' : 'Submit')}
        >
            <InputField
                id="officer-name"
                label="Full Name"
                name="name"
                icon="bx bx-user"
                placeholder="John Doe"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                error={errors.name}
            />

            <InputField
                id="officer-email"
                label="Email"
                name="email"
                type="email"
                icon="bx bx-envelope"
                placeholder="john.doe@example.com"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                error={errors.email}
            />

            <SelectField
                id="officer-branch"
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
                dropdownParent="#officerOffcanvas"
                error={errors.branch_id}
                help="Create a branch first before assigning an officer."
            />

            <SelectField
                id="officer-department"
                label="Department"
                name="department_id"
                placeholder={data.branch_id ? 'Select a department' : 'Select a branch first'}
                value={data.department_id}
                onChange={(val) => setData('department_id', val)}
                options={filteredDepartments}
                renderOption={(department) => `${department.code} - ${department.name}`}
                dropdownParent="#officerOffcanvas"
                error={errors.department_id}
                help={data.branch_id
                    ? 'No departments found for the selected branch.'
                    : 'Select a branch first before choosing a department.'}
                disabled={!data.branch_id}
            />

            <InputField
                id="officer-password"
                label={isEditing ? 'New Password (leave blank to keep current)' : 'Password'}
                name="password"
                type="password"
                icon="bx bx-lock-alt"
                placeholder="••••••••"
                value={data.password}
                onChange={(e) => setData('password', e.target.value)}
                error={errors.password}
            />

            <InputField
                id="officer-password-confirmation"
                label="Confirm Password"
                name="password_confirmation"
                type="password"
                icon="bx bx-lock-alt"
                placeholder="••••••••"
                value={data.password_confirmation}
                onChange={(e) => setData('password_confirmation', e.target.value)}
                error={errors.password}
            />
        </OffcanvasForm>
    );
}
