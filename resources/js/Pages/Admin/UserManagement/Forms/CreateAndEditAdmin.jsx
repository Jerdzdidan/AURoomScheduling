import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import OffcanvasForm from '@/Components/Form/OffcanvasForm';
import InputField from '@/Components/Input/InputField';

export default function CreateAndEditAdmin({ editId, onSuccess }) {
    const isEditing = !!editId;

    const { data, setData, post, put, processing, errors, reset, clearErrors, setDefaults } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    // When editId changes, fetch the user data to populate the form
    useEffect(() => {
        if (editId) {
            $.get(route('admin.users.admin-accounts.show', editId))
                .done((user) => {
                    setData({
                        name: user.name,
                        email: user.email,
                        password: '',
                        password_confirmation: '',
                    });
                });
        }
    }, [editId]);

    useEffect(() => {
        const $offcanvas = $('#adminOffcanvas');
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
                $('#adminOffcanvas').offcanvas('hide');
                toastr.success(
                    isEditing
                        ? 'Admin account updated successfully.'
                        : 'Admin account created successfully.'
                );
                if (onSuccess) onSuccess();
            },
        };

        if (isEditing) {
            put(route('admin.users.admin-accounts.update', editId), options);
        } else {
            post(route('admin.users.admin-accounts.store'), options);
        }
    };

    return (
        <OffcanvasForm
            id="adminOffcanvas"
            title={isEditing ? 'Edit Admin' : 'Add New Admin'}
            formId="admin-form"
            onSubmit={handleSubmit}
            submitButtonName={processing ? 'Saving...' : (isEditing ? 'Update' : 'Submit')}
        >
            <InputField
                id="admin-name"
                label="Full Name"
                name="name"
                icon="bx bx-user"
                placeholder="John Doe"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                error={errors.name}
            />

            <InputField
                id="admin-email"
                label="Email"
                name="email"
                type="email"
                icon="bx bx-envelope"
                placeholder="john.doe@example.com"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                error={errors.email}
            />

            <InputField
                id="admin-password"
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
                id="admin-password-confirmation"
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
