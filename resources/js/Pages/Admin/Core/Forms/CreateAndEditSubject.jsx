import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import OffcanvasForm from '@/Components/Form/OffcanvasForm';
import InputField from '@/Components/Input/InputField';
import SelectField from '@/Components/Input/SelectField';

const initialValues = {
    name: '',
    code: '',
    program_id: '',
};

export default function CreateAndEditSubject({ editId, programs, onSuccess }) {
    const isEditing = !!editId;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(initialValues);

    useEffect(() => {
        if (!editId) {
            reset();
            clearErrors();
            return;
        }

        $.get(route('admin.core.subjects.show', editId))
            .done((subject) => {
                setData({
                    name: subject.name ?? '',
                    code: subject.code ?? '',
                    program_id: subject.program_id?.toString() ?? '',
                });
            })
            .fail(() => {
                toastr.error('Failed to load subject details.');
            });
    }, [editId]);

    useEffect(() => {
        const $offcanvas = $('#subjectOffcanvas');

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
                $('#subjectOffcanvas').offcanvas('hide');
                toastr.success(
                    isEditing
                        ? 'Subject updated successfully.'
                        : 'Subject created successfully.'
                );

                if (onSuccess) {
                    onSuccess();
                }
            },
        };

        if (isEditing) {
            put(route('admin.core.subjects.update', editId), options);
            return;
        }

        post(route('admin.core.subjects.store'), options);
    };

    return (
        <OffcanvasForm
            id="subjectOffcanvas"
            title={isEditing ? 'Edit Subject' : 'Add New Subject'}
            formId="subject-form"
            onSubmit={handleSubmit}
            submitButtonName={processing ? 'Saving...' : (isEditing ? 'Update' : 'Submit')}
        >
            <InputField
                id="subject-name"
                label="Subject Name"
                name="name"
                icon="bx bx-book"
                placeholder="Introduction to Computing"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                error={errors.name}
            />

            <InputField
                id="subject-code"
                label="Subject Code"
                name="code"
                icon="bx bx-purchase-tag"
                placeholder="ITC 110"
                value={data.code}
                onChange={(e) => setData('code', e.target.value.toUpperCase())}
                error={errors.code}
            />

            <SelectField
                id="subject-program"
                label="Program"
                name="program_id"
                placeholder="Select a program"
                value={data.program_id}
                onChange={(val) => setData('program_id', val)}
                options={programs}
                dropdownParent="#subjectOffcanvas"
                error={errors.program_id}
                help="Create a program first before adding a subject."
            />
        </OffcanvasForm>
    );
}
