import { useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import OffcanvasForm from '@/Components/Form/OffcanvasForm';
import InputField from '@/Components/Input/InputField';
import SelectField from '@/Components/Input/SelectField';

const getInitialValues = () => ({
    branch_id: '',
    department_id: '',
    name: '',
    code: '',
    subject_type: '',
    class_type: '',
    program_id: '',
});

export default function CreateAndEditSubject({ editId, branches, departments, programs, subjectTypeOptions, classTypeOptions, onSuccess }) {
    const isEditing = !!editId;
    const { data, setData, post, put, processing, errors, clearErrors } = useForm(getInitialValues());

    const filteredDepartments = useMemo(() => {
        if (!data.branch_id) {
            return [];
        }

        return departments.filter((department) => department.branch_id?.toString() === data.branch_id?.toString());
    }, [departments, data.branch_id]);

    const filteredPrograms = useMemo(() => {
        if (!data.department_id) {
            return [];
        }

        return programs.filter((program) => program.department_id?.toString() === data.department_id?.toString());
    }, [programs, data.department_id]);

    useEffect(() => {
        if (!editId) {
            setData(getInitialValues());
            clearErrors();
            return;
        }

        $.get(route('admin.core.subjects.show', editId))
            .done((subject) => {
                const selectedProgram = programs.find(
                    (program) => program.id?.toString() === subject.program_id?.toString()
                );

                setData({
                    branch_id: selectedProgram?.branch_id?.toString() ?? '',
                    department_id: selectedProgram?.department_id?.toString() ?? '',
                    name: subject.name ?? '',
                    code: subject.code ?? '',
                    subject_type: subject.subject_type ?? '',
                    class_type: subject.class_type ?? '',
                    program_id: subject.program_id?.toString() ?? '',
                });
            })
            .fail(() => {
                toastr.error('Failed to load subject details.');
            });
    }, [editId, programs, clearErrors, setData]);

    useEffect(() => {
        const $offcanvas = $('#subjectOffcanvas');

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
            <SelectField
                id="subject-branch"
                label="Branch"
                name="branch_id"
                placeholder="Select a branch"
                value={data.branch_id}
                onChange={(val) => {
                    setData((current) => ({
                        ...current,
                        branch_id: val,
                        department_id: '',
                        program_id: '',
                    }));
                }}
                options={branches}
                dropdownParent="#subjectOffcanvas"
                error={errors.branch_id}
                help="Create a branch first before adding a subject."
            />

            <SelectField
                id="subject-department"
                label="Department"
                name="department_id"
                placeholder={data.branch_id ? 'Select a department' : 'Select a branch first'}
                value={data.department_id}
                onChange={(val) => {
                    setData((current) => ({
                        ...current,
                        department_id: val,
                        program_id: '',
                    }));
                }}
                options={filteredDepartments}
                renderOption={(department) => `${department.code} - ${department.name}`}
                dropdownParent="#subjectOffcanvas"
                error={errors.department_id}
                help={data.branch_id
                    ? 'No departments found for the selected branch.'
                    : 'Select a branch first before choosing a department.'}
                disabled={!data.branch_id}
            />

            <SelectField
                id="subject-program"
                label="Program"
                name="program_id"
                placeholder={data.department_id ? 'Select a program' : 'Select a department first'}
                value={data.program_id}
                onChange={(val) => setData('program_id', val)}
                options={filteredPrograms}
                renderOption={(program) => `${program.code} - ${program.name}`}
                dropdownParent="#subjectOffcanvas"
                error={errors.program_id}
                help={data.department_id
                    ? 'No programs found for the selected department.'
                    : 'Select a department first before choosing a program.'}
                disabled={!data.department_id}
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

            <SelectField
                id="subject-subject-type"
                label="Subject Type"
                name="subject_type"
                placeholder="Select subject type"
                value={data.subject_type}
                onChange={(val) => setData('subject_type', val)}
                options={subjectTypeOptions}
                dropdownParent="#subjectOffcanvas"
                error={errors.subject_type}
            />

            <SelectField
                id="subject-class-type"
                label="Class Type"
                name="class_type"
                placeholder="Select class type"
                value={data.class_type}
                onChange={(val) => setData('class_type', val)}
                options={classTypeOptions}
                dropdownParent="#subjectOffcanvas"
                error={errors.class_type}
            />

        </OffcanvasForm>
    );
}
