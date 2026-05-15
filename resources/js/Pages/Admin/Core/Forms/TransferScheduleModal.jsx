import { useForm } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import ModalForm from "@/Components/Form/ModalForm";
import SelectField from "@/Components/Input/SelectField";

export default function TransferScheduleModal({ isOpen, onClose, schedule, onTransferSuccess }) {
    const { data, setData, post, processing, errors, reset, clearErrors, setError } = useForm({
        new_room_id: "",
        remarks: "",
    });

    const [availableRooms, setAvailableRooms] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [roomError, setRoomError] = useState("");

    useEffect(() => {
        const $modal = window.$("#transferScheduleModal");

        if (isOpen && schedule) {
            $modal.modal("show");
            loadAvailableRooms();
        } else {
            $modal.modal("hide");
            reset();
            setAvailableRooms([]);
            clearErrors();
        }

        const handleHidden = () => {
            if (isOpen) onClose();
        };

        $modal.on("hidden.bs.modal", handleHidden);

        return () => {
            $modal.off("hidden.bs.modal", handleHidden);
        };
    }, [isOpen, schedule]);

    const loadAvailableRooms = () => {
        setLoadingRooms(true);
        setRoomError("");

        $.get(route("admin.core.room-schedules.available-rooms"), {
            academic_period_id: schedule.academic_period_id,
            branch_id: schedule.branch_id,
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            schedule_id: schedule.id,
        })
            .done((response) => {
                const rooms = response.rooms ?? [];
                // Filter out the current room
                const filteredRooms = rooms.filter(room => room.id?.toString() !== schedule.room_id?.toString());
                setAvailableRooms(filteredRooms);
            })
            .fail((xhr) => {
                const message = xhr.responseJSON?.message || "Failed to load available rooms.";
                setRoomError(message);
                toastr.error(message);
            })
            .always(() => {
                setLoadingRooms(false);
            });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!data.new_room_id) {
            setError("new_room_id", "Please select a new room.");
            return;
        }

        if (!data.remarks) {
            setError("remarks", "Remarks are required for transferring a schedule.");
            return;
        }

        axios.post(route("admin.core.room-schedules.transfer", schedule.id), data)
            .then((response) => {
                toastr.success(response.data.message || "Schedule transferred successfully.");
                onTransferSuccess();
                onClose();
            })
            .catch((error) => {
                const message = error.response?.data?.message || "Failed to transfer schedule.";
                toastr.error(message);
                if (error.response?.data?.errors) {
                    Object.keys(error.response.data.errors).forEach(key => {
                        setError(key, error.response.data.errors[key][0]);
                    });
                }
            });
    };

    const roomPlaceholder = useMemo(() => {
        if (loadingRooms) return "Loading available rooms...";
        if (roomError) return "Error loading rooms";
        if (availableRooms.length === 0) return "No other available rooms found";
        return "Select a new room";
    }, [loadingRooms, roomError, availableRooms.length]);

    return (
        <ModalForm
            id="transferScheduleModal"
            title="Transfer Schedule"
            size="modal-md"
            onSubmit={handleSubmit}
            footer={
                <>
                    <button
                        type="button"
                        className="btn btn-label-secondary"
                        onClick={onClose}
                        disabled={processing}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={processing || loadingRooms || availableRooms.length === 0}
                    >
                        {processing ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Marking To Transfer...
                            </>
                        ) : (
                            "To Transfer"
                        )}
                    </button>
                </>
            }
        >
            <div className="alert alert-info mb-4">
                <h6 className="alert-heading fw-bold mb-1">Schedule Information</h6>
                <p className="mb-0 small">
                    {schedule?.subject_code} - {schedule?.subject_name} <br/>
                    {schedule?.day_of_week} ({schedule?.start_time} - {schedule?.end_time})
                </p>
            </div>

            <div className="mb-3">
                <label className="form-label text-muted">Current Room</label>
                <input 
                    type="text" 
                    className="form-control bg-light" 
                    value={schedule?.room_code || "Unknown"} 
                    disabled 
                />
            </div>

            <SelectField
                id="transfer-new-room"
                label="To Transfer Room"
                name="new_room_id"
                placeholder={roomPlaceholder}
                value={data.new_room_id}
                onChange={(value) => {
                    clearErrors("new_room_id");
                    setData("new_room_id", value);
                }}
                options={availableRooms}
                renderOption={(room) => `${room.code} (${room.type})`}
                error={errors.new_room_id}
                disabled={loadingRooms || availableRooms.length === 0}
                required
            />

            <div className="mb-0 mt-3">
                <label className="form-label" htmlFor="transfer-remarks">
                    Remarks <span className="text-danger">*</span>
                </label>
                <textarea
                    id="transfer-remarks"
                    className={`form-control ${errors.remarks ? "is-invalid" : ""}`}
                    rows="3"
                    placeholder="Reason for transferring..."
                    value={data.remarks}
                    onChange={(e) => {
                        clearErrors("remarks");
                        setData("remarks", e.target.value);
                    }}
                    required
                ></textarea>
                {errors.remarks && (
                    <div className="invalid-feedback">{errors.remarks}</div>
                )}
            </div>
        </ModalForm>
    );
}
