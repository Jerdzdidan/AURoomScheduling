import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import OffcanvasForm from '@/Components/Form/OffcanvasForm';
import InputField from '@/Components/Input/InputField';
import SelectField from '@/Components/Input/SelectField';

const initialValues = {
    name: '',
    code: '',
    description: '',
    department_id: '',
};

export default function CreateAndEditProgram({ editId, departments, onSuccess }) {
    const isEditing = !!editId;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(initialValues);

    useEffect(() => {
        if (!editId) {
            reset();
            clearErrors();
            return;
        }

        $.get(route('admin.utilities.programs.show', editId))
            .done((program) => {
                setData({
                    name: program.name ?? '',
                    code: program.code ?? '',
                    description: program.description ?? '',
                    department_id: program.department_id?.toString() ?? '',
                });
            })
            .fail(() => {
                toastr.error('Failed to load program details.');
            });
    }, [editId]);

    useEffect(() => {
        const $offcanvas = $('#programOffcanvas');

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
                id="program-department"
                label="Department"
                name="department_id"
                placeholder="Select a department"
                value={data.department_id}
                onChange={(val) => setData('department_id', val)}
                options={departments}
                dropdownParent="#programOffcanvas"
                error={errors.department_id}
                help="Create a department first before adding a program."
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
