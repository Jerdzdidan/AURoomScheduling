import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import OffcanvasForm from '@/Components/Form/OffcanvasForm';
import InputField from '@/Components/Input/InputField';
import SelectField from '@/Components/Input/SelectField';

const semesterOptions = [
    { id: '1ST', name: '1st Semester' },
    { id: '2ND', name: '2nd Semester' },
    { id: 'SUMMER', name: 'Summer' },
];

const initialValues = {
    year_start: '',
    year_end: '',
    semester: '',
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
                    semester: academicPeriod.semester ?? '',
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
                required
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
                required
            />

            <SelectField
                id="academic-period-semester"
                label="Semester"
                name="semester"
                placeholder="Select a semester"
                value={data.semester}
                onChange={(val) => setData('semester', val)}
                options={semesterOptions}
                dropdownParent="#academicPeriodOffcanvas"
                error={errors.semester}
                required
            />
        </OffcanvasForm>
    );
}
