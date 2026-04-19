import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import OffcanvasForm from '@/Components/Form/OffcanvasForm';
import InputField from '@/Components/Input/InputField';

const initialValues = {
    year_start: '',
    year_end: '',
    semester: '1ST',
};

export default function CreateAndEditAcademicPeriod({ editId, onSuccess }) {
    const isEditing = !!editId;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(initialValues);

    useEffect(() => {
        if (!editId) {
            reset();
            clearErrors();
            return;
        }

        $.get(route('admin.utilities.academic-periods.show', editId))
            .done((academicPeriod) => {
                setData({
                    year_start: academicPeriod.year_start?.toString() ?? '',
                    year_end: academicPeriod.year_end?.toString() ?? '',
                    semester: academicPeriod.semester ?? '1ST',
                });
            })
            .fail(() => {
                toastr.error('Failed to load academic period details.');
            });
    }, [editId]);

    useEffect(() => {
        const $offcanvas = $('#academicPeriodOffcanvas');

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
                $('#academicPeriodOffcanvas').offcanvas('hide');
                toastr.success(
                    isEditing
                        ? 'Academic period updated successfully.'
                        : 'Academic period created successfully.'
                );

                if (onSuccess) {
                    onSuccess();
                }
            },
        };

        if (isEditing) {
            put(route('admin.utilities.academic-periods.update', editId), options);
            return;
        }

        post(route('admin.utilities.academic-periods.store'), options);
    };

    return (
        <OffcanvasForm
            id="academicPeriodOffcanvas"
            title={isEditing ? 'Edit Academic Period' : 'Add New Academic Period'}
            formId="academic-period-form"
            onSubmit={handleSubmit}
            submitButtonName={processing ? 'Saving...' : (isEditing ? 'Update' : 'Submit')}
        >
            <InputField
                id="academic-period-year-start"
                label="Start Year"
                name="year_start"
                type="number"
                icon="bx bx-calendar"
                placeholder="2025"
                value={data.year_start}
                onChange={(e) => setData('year_start', e.target.value)}
                error={errors.year_start}
            />

            <InputField
                id="academic-period-year-end"
                label="End Year"
                name="year_end"
                type="number"
                icon="bx bx-calendar-event"
                placeholder="2026"
                value={data.year_end}
                onChange={(e) => setData('year_end', e.target.value)}
                error={errors.year_end}
            />

            <div className="mb-3">
                <label className="form-label" htmlFor="academic-period-semester">Semester</label>
                <div className={`input-group ${errors.semester ? 'has-validation' : 'input-group-merge mb-2'}`}>
                    <span className={`input-group-text ${errors.semester ? 'border-danger' : ''}`}>
                        <i className="bx bx-book-open"></i>
                    </span>
                    <select
                        id="academic-period-semester"
                        name="semester"
                        className={`form-select ${errors.semester ? 'is-invalid' : ''}`}
                        value={data.semester}
                        onChange={(e) => setData('semester', e.target.value)}
                    >
                        <option value="1ST">1st Semester</option>
                        <option value="2ND">2nd Semester</option>
                        <option value="SUMMER">Summer</option>
                    </select>
                    {errors.semester && <div className="invalid-feedback">{errors.semester}</div>}
                </div>
            </div>
        </OffcanvasForm>
    );
}
