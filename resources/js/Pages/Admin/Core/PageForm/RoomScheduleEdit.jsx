import { Head, usePage } from "@inertiajs/react";
import { useMemo } from "react";
import Base from "@/Layouts/Base";
import CreateAndEditRoomSchedule from "../Forms/CreateAndEditRoomSchedule";

export default function RoomScheduleEdit() {
    const page = usePage();
    const {
        academicPeriods = [],
        branches = [],
        departments = [],
        subjects = [],
        professors = [],
        currentAcademicPeriod = null,
        currentAcademicPeriodId = null,
        dayOptions = [],
        roomSchedule = null,
    } = page.props;

    const returnContext = useMemo(() => {
        const query = new URLSearchParams(page.url.split("?")[1] ?? "");
        return query.get("return_context") || "";
    }, [page.url]);

    const backHref = useMemo(() => {
        if (returnContext === "room-utilization-grid") {
            return route("admin.reports.room-utilization.grid");
        }

        return route("admin.core.room-schedules.index");
    }, [returnContext]);

    const pageTitle = returnContext === "room-utilization-grid"
        ? "Reports > Room Utilization > Edit"
        : "Core > Room Schedule > Edit";

    return (
        <>
            <Head title={pageTitle} />

            <Base title={pageTitle}>
                <CreateAndEditRoomSchedule
                    academicPeriods={academicPeriods}
                    branches={branches}
                    departments={departments}
                    subjects={subjects}
                    professors={professors}
                    currentAcademicPeriod={currentAcademicPeriod}
                    currentAcademicPeriodId={currentAcademicPeriodId}
                    dayOptions={dayOptions}
                    roomSchedule={roomSchedule}
                    backHref={backHref}
                    returnContext={returnContext}
                />
            </Base>
        </>
    );
}
