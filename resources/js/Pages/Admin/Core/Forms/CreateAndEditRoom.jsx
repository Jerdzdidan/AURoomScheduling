import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import OffcanvasForm from '@/Components/Form/OffcanvasForm';
import InputField from '@/Components/Input/InputField';
import SelectField from '@/Components/Input/SelectField';

const initialValues = {
    code: '',
    room_number: '',
    type: '',
    building_id: '',
};

export default function CreateAndEditRoom({ editId, buildings, onSuccess }) {
    const isEditing = !!editId;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm(initialValues);

    useEffect(() => {
        if (!editId) {
            reset();
            clearErrors();
            return;
        }

        $.get(route('admin.core.rooms.show', editId))
            .done((room) => {
                const parts = room.code ? room.code.split('-') : [];
                const roomNumber = parts.length > 0 ? parts[parts.length - 1] : '';

                setData({
                    code: room.code ?? '',
                    room_number: roomNumber,
                    type: room.type ?? '',
                    building_id: room.building_id?.toString() ?? '',
                });
            })
            .fail(() => {
                toastr.error('Failed to load room details.');
            });
    }, [editId]);

    useEffect(() => {
        const $offcanvas = $('#roomOffcanvas');

        $offcanvas.on('hidden.bs.offcanvas', () => {
            reset();
            clearErrors();
        });

        return () => $offcanvas.off('hidden.bs.offcanvas');
    }, []);

    const updateRoomCode = (buildingId, roomNumber) => {
        const selectedBuilding = buildings.find(b => b.id.toString() === buildingId?.toString());
        const buildingCode = selectedBuilding ? selectedBuilding.code : '';
        return buildingCode && roomNumber ? `AUJSC-${buildingCode}-${roomNumber}` : '';
    };

    const handleRoomNumberChange = (e) => {
        const val = e.target.value.toUpperCase();
        setData(prev => ({
            ...prev,
            room_number: val,
            code: updateRoomCode(prev.building_id, val)
        }));
    };

    const handleBuildingChange = (val) => {
        setData(prev => ({
            ...prev,
            building_id: val,
            code: updateRoomCode(val, prev.room_number)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                reset();
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
                id="room-building"
                label="Building"
                name="building_id"
                placeholder="Select a building"
                value={data.building_id}
                onChange={handleBuildingChange}
                options={buildings}
                dropdownParent="#roomOffcanvas"
                error={errors.building_id}
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
