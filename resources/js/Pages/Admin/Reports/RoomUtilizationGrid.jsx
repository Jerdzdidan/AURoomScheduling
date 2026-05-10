import { Head, router, usePage } from "@inertiajs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import Base from "@/Layouts/Base";
import ScheduleCalendarGrid from "@/Components/Schedule/ScheduleCalendarGrid";
import AdminInlineSchedulePopover from "@/Pages/Admin/Core/Forms/AdminInlineSchedulePopover";
import { LuArrowLeft, LuDoorOpen } from "react-icons/lu";

const shortCode = (code) => {
    if (!code) return "";
    const idx = code.indexOf("-");
    return idx !== -1 ? code.substring(idx + 1) : code;
};

const semesterLabels = {
    "1ST": "1st Semester",
    "2ND": "2nd Semester",
    "SUMMER": "SUMMER",
};

export default function RoomUtilizationGrid() {
    const page = usePage();
    const {
        room,
        academicPeriod,
        schedules = [],
        branches = [],
        departments = [],
        subjects = [],
        professors = [],
        currentAcademicPeriodId = null,
    } = page.props;

    const [gridSchedules, setGridSchedules] = useState(schedules);
    const [gridLoading, setGridLoading] = useState(false);
    const [popoverData, setPopoverData] = useState(null);
    const calendarRef = useRef(null);

    useEffect(() => {
        setGridSchedules(schedules);
    }, [schedules]);

    const handleBackToUtilization = () => {
        router.post(route("admin.reports.room-utilization.grid.return"));
    };

    const handleGridEdit = (id) => {
        router.get(`${route("admin.core.room-schedules.edit", id)}?return_context=room-utilization-grid`);
    };

    const handleGridDelete = (id, subjectCode, section) => {
        Swal.fire({
            title: "Delete Room Schedule",
            text: `Are you sure you want to delete the ${subjectCode} / ${section} schedule?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete",
            cancelButtonText: "Cancel",
            customClass: {
                confirmButton: "btn btn-danger me-3",
                cancelButton: "btn btn-label-secondary",
            },
            buttonsStyling: false,
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: route("admin.core.room-schedules.delete", id),
                    type: "DELETE",
                })
                    .done((res) => {
                        toastr.success(res.message || "Room schedule deleted successfully.");
                        loadGridSchedules();
                    })
                    .fail((xhr) => {
                        const message = xhr.responseJSON?.message || "Failed to delete room schedule.";
                        toastr.error(message);
                    });
            }
        });
    };

    const loadGridSchedules = useCallback(() => {
        if (!room?.id || !academicPeriod?.id) {
            return;
        }

        setGridLoading(true);

        $.get(route("admin.core.room-schedules.grid-data"), {
            room_id: room.id,
            academic_period_id: academicPeriod.id,
        })
            .done((response) => {
                setGridSchedules(response.schedules ?? []);
            })
            .fail(() => {
                toastr.error("Failed to load schedules.");
            })
            .always(() => {
                setGridLoading(false);
            });
    }, [academicPeriod?.id, room?.id]);

    const handleEmptyClick = ({ day, startTime, endTime, anchorRect }) => {
        if (!room || !academicPeriod?.id) return;

        if (!currentAcademicPeriodId) {
            toastr.warning("No current academic period is set.");
            return;
        }

        if (String(academicPeriod.id) !== String(currentAcademicPeriodId)) {
            toastr.warning("You can only create new schedules in the current academic period.");
            return;
        }

        setPopoverData({ day, startTime, endTime, anchorRect });
    };

    const handlePopoverClose = () => {
        setPopoverData(null);
    };

    const handlePopoverSaved = () => {
        setPopoverData(null);
        loadGridSchedules();
    };

    const periodLabel = academicPeriod
        ? `A.Y. ${academicPeriod.academic_year} – ${semesterLabels[academicPeriod.semester] ?? academicPeriod.semester}`
        : "Unknown Period";

    return (
        <>
            <Head title={`Reports > Room Utilization > ${room?.code || "Grid"}`} />

            <Base title="Reports > Room Utilization">
                <div className="officer-calendar-wrapper">
                    {/* Grid Header */}
                    <div className="card mb-4 mt-2">
                        <div className="card-body py-3">
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                                <div>
                                    <h6 className="mb-0 fw-bold d-flex align-items-center gap-2 flex-wrap">
                                        <LuDoorOpen size={18} className="text-primary" />
                                        {shortCode(room.code)}
                                        <span className="badge bg-label-secondary ms-1" style={{ fontSize: "0.7rem" }}>
                                            {room.type}
                                        </span>
                                        <span className="badge bg-label-primary fw-semibold" style={{ fontSize: "0.75rem" }}>
                                            {periodLabel}
                                        </span>
                                    </h6>
                                    <small className="text-muted mt-1 d-block">
                                        {room.building_code} – {room.building_name}
                                        {room.branch_name && ` · ${room.branch_name}`}
                                    </small>
                                </div>
                                <div className="text-end ms-auto">
                                    <button
                                        type="button"
                                        className="btn btn-label-secondary d-flex align-items-center gap-2"
                                        onClick={handleBackToUtilization}
                                    >
                                        <LuArrowLeft size={16} />
                                        Back to Room Utilization
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <ScheduleCalendarGrid
                        schedules={gridSchedules}
                        loading={gridLoading}
                        isAdmin={true}
                        onEdit={handleGridEdit}
                        onDelete={handleGridDelete}
                        onEmptyClick={handleEmptyClick}
                        ghostBlock={popoverData}
                        calendarRef={calendarRef}
                    />
                </div>

                {popoverData && room && (
                    <AdminInlineSchedulePopover
                        day={popoverData.day}
                        startTime={popoverData.startTime}
                        endTime={popoverData.endTime}
                        room={room}
                        branches={branches}
                        departments={departments}
                        subjects={subjects}
                        professors={professors}
                        currentAcademicPeriodId={currentAcademicPeriodId}
                        anchorRect={popoverData.anchorRect}
                        calendarRect={calendarRef.current?.getBoundingClientRect()}
                        onClose={handlePopoverClose}
                        onSaved={handlePopoverSaved}
                    />
                )}
            </Base>
        </>
    );
}
