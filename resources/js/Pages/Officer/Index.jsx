import { Head, router, usePage } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Base from "@/Layouts/Base";
import SelectField from "@/Components/Input/SelectField";
import ScheduleCalendarGrid from "@/Components/Schedule/ScheduleCalendarGrid";
import InlineSchedulePopover from "./Forms/InlineSchedulePopover";
import { LuDoorOpen, LuCalendarRange } from "react-icons/lu";

const semesterLabels = {
    "1ST": "1st Semester",
    "2ND": "2nd Semester",
    "SUMMER": "SUMMER",
};

// Strip branch code prefix: "BRN-BLD-101" → "BLD-101"
const shortCode = (code) => {
    if (!code) return "";
    const idx = code.indexOf("-");
    return idx !== -1 ? code.substring(idx + 1) : code;
};

export default function Index() {
    const page = usePage();
    const {
        rooms = [],
        academicPeriods = [],
        currentAcademicPeriodId,
        departmentCode,
        branchCode,
        subjects = [],
        professors = [],
        currentAcademicPeriod = null,
    } = page.props;

    const pageQuery = useMemo(
        () => new URLSearchParams(page.url.split("?")[1] ?? ""),
        [page.url],
    );

    const selectedRoomId = useMemo(
        () => pageQuery.get("room_id"),
        [pageQuery],
    );
    const [selectedPeriodId, setSelectedPeriodId] = useState(
        pageQuery.get("academic_period_id")
            ?? (currentAcademicPeriodId ? String(currentAcademicPeriodId) : ""),
    );
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);

    // Inline popover state
    const [popoverData, setPopoverData] = useState(null);
    const calendarRef = useRef(null);

    const selectedRoom = useMemo(
        () => rooms.find((r) => String(r.id) === String(selectedRoomId)),
        [rooms, selectedRoomId],
    );

    const sortedAcademicPeriods = useMemo(() => {
        const semesterOrder = { "SUMMER": 3, "2ND": 2, "1ST": 1 };

        const sorted = [...academicPeriods].sort((a, b) => {
            const yearCmp = (b.academic_year || "").localeCompare(a.academic_year || "");

            if (yearCmp !== 0) return yearCmp;

            return (semesterOrder[b.semester] || 0) - (semesterOrder[a.semester] || 0);
        });

        const current = sorted.filter((p) => p.is_current);
        const rest = sorted.filter((p) => !p.is_current);

        return [...current, ...rest];
    }, [academicPeriods]);

    const formatPeriod = (period) => {
        if (!period) return "Select a period";

        if (period.academic_year && period.semester) {
            return `A.Y. ${period.academic_year} – ${semesterLabels[period.semester] ?? period.semester}`;
        }

        return period.name || "Unknown";
    };

    // Load schedules whenever room or period changes
    const loadSchedules = useCallback(() => {
        if (!selectedRoomId || !selectedPeriodId || !selectedRoom) {
            setSchedules([]);
            return;
        }

        setLoading(true);

        $.get(route("officer.schedules.data"), {
            room_id: selectedRoomId,
            academic_period_id: selectedPeriodId,
        })
            .done((response) => {
                setSchedules(response.schedules ?? []);
            })
            .fail(() => {
                toastr.error("Failed to load schedules.");
                setSchedules([]);
            })
            .always(() => {
                setLoading(false);
            });
    }, [selectedPeriodId, selectedRoom, selectedRoomId]);

    useEffect(() => {
        loadSchedules();
    }, [loadSchedules]);

    const handleEdit = (id) => {
        const returnParams = new URLSearchParams();

        if (selectedRoomId) {
            returnParams.set("room_id", selectedRoomId);
        }

        if (selectedPeriodId) {
            returnParams.set("academic_period_id", selectedPeriodId);
        }

        const returnTo = returnParams.toString()
            ? `${route("officer.index")}?${returnParams.toString()}`
            : route("officer.index");

        router.get(route("officer.schedules.edit", {
            id,
            return_to: returnTo,
        }));
    };

    const handleDelete = (id, subjectCode, section) => {
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
                    url: route("officer.schedules.delete", id),
                    type: "DELETE",
                })
                    .done((res) => {
                        toastr.success(res.message || "Room schedule deleted successfully.");
                        loadSchedules();
                    })
                    .fail((xhr) => {
                        const message = xhr.responseJSON?.message || "Failed to delete room schedule.";

                        toastr.error(message);
                    });
            }
        });
    };

    const handleEmptyClick = ({ day, startTime, endTime, anchorRect }) => {
        // Only allow creation when a room is selected and period chosen
        if (!selectedRoom || !selectedPeriodId) return;

        // Only allow on rooms assigned to the officer's department
        if (!selectedRoom.is_assigned_to_department) {
            toastr.warning("You can only create schedules on rooms assigned to your department.");
            return;
        }

        // Only allow for current academic period
        if (!currentAcademicPeriod) {
            toastr.warning("No current academic period is set. Contact your administrator.");
            return;
        }

        if (String(selectedPeriodId) !== String(currentAcademicPeriodId)) {
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
        loadSchedules();
    };

    // No rooms available in the officer's branch
    if (rooms.length === 0) {
        return (
            <>
                <Head title="Schedule" />

                <Base title="Room Schedule">
                    <div className="officer-calendar-empty">
                        <LuDoorOpen className="empty-icon" />
                        <div className="empty-title">No Rooms Available</div>
                        <div className="empty-text">
                            No rooms are registered in your branch yet. Contact your administrator to get started.
                        </div>
                    </div>
                </Base>
            </>
        );
    }

    return (
        <>
            <Head title="Schedule" />

            <Base title="Room Schedule">
                <div className="officer-calendar-wrapper">
                    {/* ── Header Bar ────────────────────────── */}
                    <div className="card mb-4">
                        <div className="card-body py-3">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                <div>
                                    {selectedRoom ? (
                                        <>
                                            <h5 className="room-title mb-1">
                                                <LuDoorOpen size={20} className="me-2" style={{ verticalAlign: "text-bottom" }} />
                                                {shortCode(selectedRoom.code)}
                                                <span className="badge bg-label-secondary ms-2" style={{ fontSize: "0.7rem", verticalAlign: "middle" }}>
                                                    {selectedRoom.type}
                                                </span>
                                                {selectedRoom.is_assigned_to_department && (
                                                    <span className="badge bg-label-primary ms-2" style={{ fontSize: "0.7rem", verticalAlign: "middle" }}>
                                                        Assigned
                                                    </span>
                                                )}
                                            </h5>
                                            <p className="room-subtitle mb-0">
                                                {selectedRoom.building_code} – {selectedRoom.building_name}
                                                {selectedRoom.is_assigned_to_department
                                                    ? (departmentCode ? ` · ${departmentCode}` : " · Assigned to your department")
                                                    : " · Not assigned to your department"}
                                                {branchCode && ` · ${branchCode}`}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <h5 className="room-title mb-1">Select a Room</h5>
                                            <p className="room-subtitle mb-0">Choose a room from the sidebar to view its schedule. Rooms marked Assigned belong to your department.</p>
                                        </>
                                    )}
                                </div>

                                <div style={{ minWidth: "280px" }} className="mb-0 align-self-center officer-period-select">
                                    <SelectField
                                        id="academic-period-select"
                                        name="academic_period_id"
                                        placeholder="Select academic period"
                                        value={selectedPeriodId}
                                        onChange={(value) => setSelectedPeriodId(value)}
                                        options={sortedAcademicPeriods}
                                        renderOption={(period) =>
                                            `${formatPeriod(period)}${period.is_current ? " (Current)" : ""}`
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Calendar Grid ──────────────────────── */}
                    {selectedRoom && selectedPeriodId ? (
                        <ScheduleCalendarGrid
                            schedules={schedules}
                            loading={loading}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onEmptyClick={handleEmptyClick}
                            ghostBlock={popoverData}
                            isAdmin={false}
                            calendarRef={calendarRef}
                        />
                    ) : (
                        <div className="officer-calendar-empty">
                            <LuCalendarRange className="empty-icon" />
                            <div className="empty-title">
                                {!selectedRoom ? "Select a Room" : "Select an Academic Period"}
                            </div>
                            <div className="empty-text">
                                {!selectedRoom
                                    ? "Choose a room from the sidebar to view its weekly schedule."
                                    : "Select an academic period from the dropdown above to view schedules."}
                            </div>
                        </div>
                    )}

                    {/* Inline schedule popover */}
                    {popoverData && selectedRoom && (
                        <InlineSchedulePopover
                            day={popoverData.day}
                            startTime={popoverData.startTime}
                            endTime={popoverData.endTime}
                            room={selectedRoom}
                            subjects={subjects}
                            professors={professors}
                            currentAcademicPeriodId={currentAcademicPeriodId}
                            anchorRect={popoverData.anchorRect}
                            calendarRect={calendarRef.current?.getBoundingClientRect()}
                            onClose={handlePopoverClose}
                            onSaved={handlePopoverSaved}
                        />
                    )}
                </div>
            </Base>
        </>
    );
}
