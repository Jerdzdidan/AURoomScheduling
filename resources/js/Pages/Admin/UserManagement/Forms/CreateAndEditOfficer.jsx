import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import OffcanvasForm from '@/Components/Form/OffcanvasForm';
import InputField from '@/Components/Input/InputField';
import SelectField from '@/Components/Input/SelectField';

export default function CreateAndEditOfficer({ editId, departments, onSuccess }) {
    const isEditing = !!editId;

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        department_id: '',
    });

    // When editId changes, fetch the user data to populate the form
    useEffect(() => {
        if (!editId) {
            reset();
            clearErrors();
            return;
        }

        $.get(route('admin.users.officer-accounts.show', editId))
            .done((user) => {
                setData({
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
    }, [editId]);

    useEffect(() => {
        const $offcanvas = $('#officerOffcanvas');
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
                id="officer-department"
                label="Department"
                name="department_id"
                placeholder="Select a department"
                value={data.department_id}
                onChange={(val) => setData('department_id', val)}
                options={departments}
                dropdownParent="#officerOffcanvas"
                error={errors.department_id}
                help="Create a department first before adding an officer."
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
