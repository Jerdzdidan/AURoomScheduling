import { useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import OffcanvasForm from '@/Components/Form/OffcanvasForm';
import InputField from '@/Components/Input/InputField';
import SelectField from '@/Components/Input/SelectField';

const getInitialValues = () => ({
    branch_id: '',
    code: '',
    room_number: '',
    type: '',
    building_id: '',
});

export default function CreateAndEditRoom({ editId, branches, buildings, onSuccess }) {
    const isEditing = !!editId;
    const { data, setData, post, put, processing, errors, clearErrors } = useForm(getInitialValues());

    const filteredBuildings = useMemo(() => {
        if (!data.branch_id) {
            return [];
        }

        return buildings.filter((building) => building.branch_id?.toString() === data.branch_id?.toString());
    }, [buildings, data.branch_id]);

    useEffect(() => {
        if (!editId) {
            setData(getInitialValues());
            clearErrors();
            return;
        }

        $.get(route('admin.core.rooms.show', editId))
            .done((room) => {
                const parts = room.code ? room.code.split('-') : [];
                const roomNumber = parts.length > 0 ? parts[parts.length - 1] : '';

                setData({
                    branch_id: room.branch_id?.toString() ?? '',
                    code: room.code ?? '',
                    room_number: roomNumber,
                    type: room.type ?? '',
                    building_id: room.building_id?.toString() ?? '',
                });
            })
            .fail(() => {
                toastr.error('Failed to load room details.');
            });
    }, [editId, clearErrors, setData]);

    useEffect(() => {
        const $offcanvas = $('#roomOffcanvas');

        $offcanvas.on('hidden.bs.offcanvas', () => {
            setData(getInitialValues());
            clearErrors();
        });

        return () => $offcanvas.off('hidden.bs.offcanvas');
    }, [clearErrors, setData]);

    const updateRoomCode = (buildingId, roomNumber) => {
        const selectedBuilding = buildings.find(b => b.id.toString() === buildingId?.toString());
        const buildingCode = selectedBuilding ? selectedBuilding.code : '';

        if (!buildingCode) {
            return '';
        }

        return roomNumber
            ? `AUJSC-${buildingCode}-${roomNumber}`
            : `AUJSC-${buildingCode}-`;
    };

    const handleRoomNumberChange = (e) => {
        const val = e.target.value.toUpperCase();
        setData({
            ...data,
            room_number: val,
            code: updateRoomCode(data.building_id, val),
        });
    };

    const handleBuildingChange = (val) => {
        setData({
            ...data,
            building_id: val,
            code: updateRoomCode(val, data.room_number),
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                setData(getInitialValues());
                $('#roomOffcanvas').offcanvas('hide');
                toastr.success(
                    isEditing
                        ? 'Room updated successfully.'
                        : 'Room created successfully.'
                );

                if (onSuccess) {
                    onSuccess();
                }
            },
        };

        if (isEditing) {
            put(route('admin.core.rooms.update', editId), options);
            return;
        }

        post(route('admin.core.rooms.store'), options);
    };

    return (
        <OffcanvasForm
            id="roomOffcanvas"
            title={isEditing ? 'Edit Room' : 'Add New Room'}
            formId="room-form"
            onSubmit={handleSubmit}
            submitButtonName={processing ? 'Saving...' : (isEditing ? 'Update' : 'Submit')}
        >
            <InputField
                id="room-code"
                label="Room Code"
                name="code"
                icon="bx bx-qr"
                placeholder=""
                value={data.code}
                onChange={() => {}}
                error={errors.code}
                disabled={true}
                help="Automatically generated based on building and room number."
            />

            <SelectField
                id="room-branch"
                label="Branch"
                name="branch_id"
                placeholder="Select a branch"
                value={data.branch_id}
                onChange={(val) => {
                    setData({
                        ...data,
                        branch_id: val,
                        building_id: '',
                        code: updateRoomCode('', data.room_number),
                    });
                }}
                options={branches}
                dropdownParent="#roomOffcanvas"
                error={errors.branch_id}
                help="Create a branch first before adding a room."
            />

            <SelectField
                id="room-building"
                label="Building"
                name="building_id"
                placeholder={data.branch_id ? 'Select a building' : 'Select a branch first'}
                value={data.building_id}
                onChange={handleBuildingChange}
                options={filteredBuildings}
                renderOption={(building) => `${building.code} - ${building.name}`}
                dropdownParent="#roomOffcanvas"
                error={errors.building_id}
                help={data.branch_id
                    ? 'No buildings found for the selected branch.'
                    : 'Select a branch first before choosing a building.'}
                disabled={!data.branch_id}
            />

            <InputField
                id="room-number"
                label="Room Number"
                name="room_number"
                icon="bx bx-door-open"
                placeholder="102"
                value={data.room_number}
                onChange={handleRoomNumberChange}
                error={errors.code}
            />

            <InputField
                id="room-type"
                label="Room Type"
                name="type"
                icon="bx bx-category"
                placeholder="Laboratory"
                value={data.type}
                onChange={(e) => setData('type', e.target.value)}
                error={errors.type}
            />
        </OffcanvasForm>
    );
}
