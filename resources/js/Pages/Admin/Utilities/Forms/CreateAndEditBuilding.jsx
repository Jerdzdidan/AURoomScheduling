import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import OffcanvasForm from '@/Components/Form/OffcanvasForm';
import InputField from '@/Components/Input/InputField';
import SelectField from '@/Components/Input/SelectField';

const initialValues = {
    name: '',
    code: '',
    branch_id: '',
};

export default function CreateAndEditBuilding({ editId, branches, onSuccess }) {
    const isEditing = !!editId;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(initialValues);

    useEffect(() => {
        if (!editId) {
            reset();
            clearErrors();
            return;
        }

        $.get(route('admin.utilities.buildings.show', editId))
            .done((building) => {
                setData({
                    name: building.name ?? '',
                    code: building.code ?? '',
                    branch_id: building.branch_id?.toString() ?? '',
                });
            })
            .fail(() => {
                toastr.error('Failed to load building details.');
            });
    }, [editId]);

    useEffect(() => {
        const $offcanvas = $('#buildingOffcanvas');

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
                $('#buildingOffcanvas').offcanvas('hide');
                toastr.success(
                    isEditing
                        ? 'Building updated successfully.'
                        : 'Building created successfully.'
                );

                if (onSuccess) {
                    onSuccess();
                }
            },
        };

        if (isEditing) {
            put(route('admin.utilities.buildings.update', editId), options);
            return;
        }

        post(route('admin.utilities.buildings.store'), options);
    };

    return (
        <OffcanvasForm
            id="buildingOffcanvas"
            title={isEditing ? 'Edit Building' : 'Add New Building'}
            formId="building-form"
            onSubmit={handleSubmit}
            submitButtonName={processing ? 'Saving...' : (isEditing ? 'Update' : 'Submit')}
        >
            <InputField
                id="building-name"
                label="Building Name"
                name="name"
                icon="bx bx-building"
                placeholder="Plaridel Hall"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                error={errors.name}
            />

            <InputField
                id="building-code"
                label="Building Code"
                name="code"
                icon="bx bx-purchase-tag"
                placeholder="PH"
                value={data.code}
                onChange={(e) => setData('code', e.target.value.toUpperCase())}
                error={errors.code}
            />

            <SelectField
                id="building-branch"
                label="Branch"
                name="branch_id"
                placeholder="Select a branch"
                value={data.branch_id}
                onChange={(val) => setData('branch_id', val)}
                options={branches}
                dropdownParent="#buildingOffcanvas"
                error={errors.branch_id}
                help="Create a branch first before adding a building."
            />
        </OffcanvasForm>
    );
}
