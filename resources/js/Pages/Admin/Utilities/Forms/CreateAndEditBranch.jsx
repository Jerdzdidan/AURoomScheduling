import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import OffcanvasForm from '@/Components/Form/OffcanvasForm';
import InputField from '@/Components/Input/InputField';

const initialValues = {
    name: '',
    code: '',
};

export default function CreateAndEditBranch({ editId, onSuccess }) {
    const isEditing = !!editId;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(initialValues);

    useEffect(() => {
        if (!editId) {
            reset();
            clearErrors();
            return;
        }

        $.get(route('admin.utilities.branches.show', editId))
            .done((branch) => {
                setData({
                    name: branch.name ?? '',
                    code: branch.code ?? '',
                });
            })
            .fail(() => {
                toastr.error('Failed to load branch details.');
            });
    }, [editId]);

    useEffect(() => {
        const $offcanvas = $('#branchOffcanvas');

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
                $('#branchOffcanvas').offcanvas('hide');
                toastr.success(
                    isEditing
                        ? 'Branch updated successfully.'
                        : 'Branch created successfully.'
                );

                if (onSuccess) {
                    onSuccess();
                }
            },
        };

        if (isEditing) {
            put(route('admin.utilities.branches.update', editId), options);
            return;
        }

        post(route('admin.utilities.branches.store'), options);
    };

    return (
        <OffcanvasForm
            id="branchOffcanvas"
            title={isEditing ? 'Edit Branch' : 'Add New Branch'}
            formId="branch-form"
            onSubmit={handleSubmit}
            submitButtonName={processing ? 'Saving...' : (isEditing ? 'Update' : 'Submit')}
        >
            <InputField
                id="branch-name"
                label="Branch Name"
                name="name"
                icon="bx bx-buildings"
                placeholder="Arellano University - Main"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                error={errors.name}
                required
            />

            <InputField
                id="branch-code"
                label="Branch Code"
                name="code"
                icon="bx bx-purchase-tag"
                placeholder="MAIN"
                value={data.code}
                onChange={(e) => setData('code', e.target.value.toUpperCase())}
                error={errors.code}
                required
            />
        </OffcanvasForm>
    );
}
