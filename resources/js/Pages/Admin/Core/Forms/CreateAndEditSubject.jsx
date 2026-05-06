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
});

export default function CreateAndEditSubject({ editId, branches, departments, subjectTypeOptions, classTypeOptions, onSuccess }) {
    const isEditing = !!editId;
    const { data, setData, post, put, processing, errors, clearErrors } = useForm(getInitialValues());

    const filteredDepartments = useMemo(() => {
        if (!data.branch_id) {
            return [];
        }

        return departments.filter((department) => department.branch_id?.toString() === data.branch_id?.toString());
    }, [departments, data.branch_id]);

    useEffect(() => {
        if (!editId) {
            setData(getInitialValues());
            clearErrors();
            return;
        }

        $.get(route('admin.core.subjects.show', editId))
            .done((subject) => {
                const selectedDepartment = departments.find(
                    (department) => department.id?.toString() === subject.department_id?.toString()
                );

                setData({
                    branch_id: selectedDepartment?.branch_id?.toString() ?? '',
                    department_id: subject.department_id?.toString() ?? '',
                    name: subject.name ?? '',
                    code: subject.code ?? '',
                    subject_type: subject.subject_type ?? '',
                    class_type: subject.class_type ?? '',
                });
            })
            .fail(() => {
                toastr.error('Failed to load subject details.');
            });
    }, [clearErrors, departments, editId, setData]);

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
            preserveState: true,
            preserveScroll: true,
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
                    }));
                }}
                options={branches}
                dropdownParent="#subjectOffcanvas"
                error={errors.branch_id}
                help="Create a branch first before adding a subject."
                required
            />

            <SelectField
                id="subject-department"
                label="Department"
                name="department_id"
                placeholder={data.branch_id ? 'Select a department' : 'Select a branch first'}
                value={data.department_id}
                onChange={(val) => setData('department_id', val)}
                options={filteredDepartments}
                renderOption={(department) => `${department.code} - ${department.name}`}
                dropdownParent="#subjectOffcanvas"
                error={errors.department_id}
                help={data.branch_id
                    ? 'No departments found for the selected branch.'
                    : 'Select a branch first before choosing a department.'}
                disabled={!data.branch_id}
                required
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
                required
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
                required
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
                required
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
                required
            />
        </OffcanvasForm>
    );
}
