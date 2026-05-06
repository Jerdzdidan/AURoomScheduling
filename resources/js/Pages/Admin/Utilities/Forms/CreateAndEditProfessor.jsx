import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import OffcanvasForm from '@/Components/Form/OffcanvasForm';
import InputField from '@/Components/Input/InputField';

const initialValues = {
    name: '',
    code: '',
};

export default function CreateAndEditProfessor({ editId, onSuccess }) {
    const isEditing = !!editId;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(initialValues);

    useEffect(() => {
        if (!editId) {
            reset();
            clearErrors();
            return;
        }

        $.get(route('admin.utilities.professors.show', editId))
            .done((professor) => {
                setData({
                    name: professor.name ?? '',
                });
            })
            .fail(() => {
                toastr.error('Failed to load professor details.');
            });
    }, [editId]);

    useEffect(() => {
        const $offcanvas = $('#professorOffcanvas');

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
                $('#professorOffcanvas').offcanvas('hide');
                toastr.success(
                    isEditing
                        ? 'Professor updated successfully.'
                        : 'Professor created successfully.'
                );

                if (onSuccess) {
                    onSuccess();
                }
            },
        };

        if (isEditing) {
            put(route('admin.utilities.professors.update', editId), options);
            return;
        }

        post(route('admin.utilities.professors.store'), options);
    };

    return (
        <OffcanvasForm
            id="professorOffcanvas"
            title={isEditing ? 'Edit Professor' : 'Add New Professor'}
            formId="professor-form"
            onSubmit={handleSubmit}
            submitButtonName={processing ? 'Saving...' : (isEditing ? 'Update' : 'Submit')}
        >
            <InputField
                id="profesor-name"
                label="Professor name"
                name="name"
                icon="bx bx-user"
                placeholder="John Doe"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                error={errors.name}
                required
            />

        </OffcanvasForm>
    );
}
