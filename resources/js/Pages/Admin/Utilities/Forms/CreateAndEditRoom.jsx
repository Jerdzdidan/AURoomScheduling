import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import OffcanvasForm from '@/Components/Form/OffcanvasForm';
import InputField from '@/Components/Input/InputField';
import SelectField from '@/Components/Input/SelectField';

const getInitialValues = () => ({
    branch_id: '',
    code: '',
    room_number: '',
    type: '',
    building_id: '',
    department_ids: [],
});

export default function CreateAndEditRoom({ editId, branches, departments, buildings, onSuccess }) {
    const isEditing = !!editId;
    const { data, setData, post, put, processing, errors, clearErrors, reset } = useForm(getInitialValues());
    const [departmentPickerValue, setDepartmentPickerValue] = useState('');

    const filteredBuildings = useMemo(() => {
        if (!data.branch_id) {
            return [];
        }

        return buildings.filter((building) => building.branch_id?.toString() === data.branch_id?.toString());
    }, [buildings, data.branch_id]);

    const filteredDepartments = useMemo(() => {
        if (!data.branch_id) {
            return [];
        }

        return departments.filter((department) => department.branch_id?.toString() === data.branch_id?.toString());
    }, [data.branch_id, departments]);

    const selectedDepartments = useMemo(() => {
        const selectedDepartmentIds = new Set((data.department_ids ?? []).map((id) => id?.toString()));

        return filteredDepartments.filter((department) => selectedDepartmentIds.has(department.id?.toString()));
    }, [data.department_ids, filteredDepartments]);

    const availableDepartments = useMemo(() => {
        const selectedDepartmentIds = new Set((data.department_ids ?? []).map((id) => id?.toString()));

        return filteredDepartments.filter((department) => !selectedDepartmentIds.has(department.id?.toString()));
    }, [data.department_ids, filteredDepartments]);

    useEffect(() => {
        if (!editId) {
            reset();
            setDepartmentPickerValue('');
            clearErrors();
            return;
        }

        $.get(route('admin.utilities.rooms.show', editId))
            .done((room) => {
                const parts = room.code ? room.code.split('-') : [];
                const roomNumber = parts.length > 0 ? parts[parts.length - 1] : '';

                setData({
                    branch_id: room.branch_id?.toString() ?? '',
                    code: room.code ?? '',
                    room_number: roomNumber,
                    type: room.type ?? '',
                    building_id: room.building_id?.toString() ?? '',
                    department_ids: room.department_ids?.map((departmentId) => departmentId?.toString()) ?? [],
                });
            })
            .fail(() => {
                toastr.error('Failed to load room details.');
            });
    }, [editId, clearErrors, reset, setData]);

    useEffect(() => {
        const $offcanvas = $('#roomOffcanvas');

        $offcanvas.on('hidden.bs.offcanvas', () => {
            reset();
            setDepartmentPickerValue('');
            clearErrors();
        });

        return () => $offcanvas.off('hidden.bs.offcanvas');
    }, [clearErrors, reset]);

    const updateRoomCode = (branchId, buildingId, roomNumber) => {
        const selectedBranch = branches.find(b => b.id.toString() === branchId?.toString());
        const branchCode = selectedBranch ? selectedBranch.code : '';

        const selectedBuilding = buildings.find(b => b.id.toString() === buildingId?.toString());
        const buildingCode = selectedBuilding ? selectedBuilding.code : '';

        if (!branchCode) {
            return '';
        }

        if (!buildingCode) {
            return '';
        }

        return roomNumber
            ? `${branchCode}-${buildingCode}-${roomNumber}`
            : `${branchCode}-${buildingCode}-`;
    };

    const toggleDepartment = (departmentId) => {
        const normalizedDepartmentId = departmentId?.toString();

        setData((current) => {
            const currentDepartmentIds = current.department_ids ?? [];
            const isSelected = currentDepartmentIds.includes(normalizedDepartmentId);

            return {
                ...current,
                department_ids: isSelected
                    ? currentDepartmentIds.filter((id) => id !== normalizedDepartmentId)
                    : [...currentDepartmentIds, normalizedDepartmentId],
            };
        });
    };

    const handleRoomNumberChange = (e) => {
        const val = e.target.value.toUpperCase();
        setData((current) => ({
            ...current,
            room_number: val,
            code: updateRoomCode(current.branch_id, current.building_id, val),
        }));
    };

    const handleBuildingChange = (val) => {
        setData((current) => ({
            ...current,
            building_id: val,
            code: updateRoomCode(current.branch_id, val, current.room_number),
        }));
    };

    const handleDepartmentSelect = (departmentId) => {
        setDepartmentPickerValue(departmentId);

        if (!departmentId) {
            return;
        }

        const normalizedDepartmentId = departmentId.toString();

        setData((current) => {
            const currentDepartmentIds = current.department_ids ?? [];

            if (currentDepartmentIds.includes(normalizedDepartmentId)) {
                return current;
            }

            return {
                ...current,
                department_ids: [...currentDepartmentIds, normalizedDepartmentId],
            };
        });

        setDepartmentPickerValue('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                reset();
                setDepartmentPickerValue('');
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
            put(route('admin.utilities.rooms.update', editId), options);
            return;
        }

        post(route('admin.utilities.rooms.store'), options);
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
                    setData((current) => ({
                        ...current,
                        branch_id: val,
                        building_id: '',
                        code: '',
                        department_ids: [],
                    }));
                    setDepartmentPickerValue('');
                }}
                options={branches}
                dropdownParent="#roomOffcanvas"
                error={errors.branch_id}
                help="Create a branch first before adding a room."
                required
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
                required
            />

            <div className="mb-3">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                    <div>
                        <label className="form-label mb-1">Assigned Departments</label>
                        <div className="form-text mt-0">
                            Optional. Assigned departments control which officers can schedule this room. You can leave this empty for rooms that are shared or not yet assigned.
                        </div>
                    </div>

                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setData('department_ids', [])}
                        disabled={!data.department_ids?.length}
                    >
                        Clear
                    </button>
                </div>

                <div
                    className={`border rounded p-3 ${errors.department_ids ? 'border-danger' : ''}`}
                    style={{ minHeight: '120px' }}
                >
                    {selectedDepartments.length > 0 && (
                        <div className="d-flex flex-wrap gap-2 mb-3">
                            {selectedDepartments.map((department) => (
                                <span
                                    key={department.id}
                                    className="badge bg-primary d-inline-flex align-items-center gap-2 py-2 px-3"
                                >
                                    <span>{department.code} - {department.name}</span>
                                    <button
                                        type="button"
                                        className="btn p-0 border-0 bg-transparent text-white d-inline-flex align-items-center"
                                        onClick={() => toggleDepartment(department.id)}
                                        aria-label={`Remove ${department.code}`}
                                        title={`Remove ${department.code}`}
                                        style={{ lineHeight: 1 }}
                                    >
                                        <i className="bx bx-x fs-5" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    <SelectField
                        id="room-department-picker"
                        label=""
                        name="department_picker"
                        placeholder={data.branch_id ? 'Search and add a department' : 'Select a branch first'}
                        value={departmentPickerValue}
                        onChange={handleDepartmentSelect}
                        options={availableDepartments}
                        renderOption={(department) => `${department.code} - ${department.name}`}
                        dropdownParent="#roomOffcanvas"
                        disabled={!data.branch_id || !availableDepartments.length}
                        help={data.branch_id
                            ? availableDepartments.length
                                ? ''
                                : 'All departments in this branch are already assigned.'
                            : 'Select a branch first before assigning departments.'}
                    />

                    <div className="form-text mt-1">
                        {filteredDepartments.length
                            ? `${selectedDepartments.length} of ${filteredDepartments.length} department(s) assigned.`
                            : data.branch_id
                                ? 'No departments found for the selected branch.'
                                : ''}
                    </div>
                </div>

                {errors.department_ids && (
                    <div className="invalid-feedback d-block">{errors.department_ids}</div>
                )}
            </div>

            <InputField
                id="room-number"
                label="Room Number"
                name="room_number"
                icon="bx bx-door-open"
                placeholder="102"
                value={data.room_number}
                onChange={handleRoomNumberChange}
                error={errors.code}
                required
            />

            <SelectField
                id="room-type"
                label="Room Type"
                name="type"
                placeholder="Select a room type"
                value={data.type}
                onChange={(val) => setData('type', val)}
                options={[
                    { id: 'Lec Room', name: 'Lec Room' },
                    { id: 'Lab Room', name: 'Lab Room' },
                ]}
                dropdownParent="#roomOffcanvas"
                error={errors.type}
                required
            />
        </OffcanvasForm>
    );
}
