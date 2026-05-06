import { Head, usePage } from "@inertiajs/react";
import { useMemo } from "react";
import Base from "@/Layouts/Base";
import CreateAndEditOfficerSchedule from "../Forms/CreateAndEditOfficerSchedule";

export default function ScheduleEdit() {
    const page = usePage();
    const {
        subjects = [],
        professors = [],
        currentAcademicPeriod = null,
        currentAcademicPeriodId = null,
        dayOptions = [],
        branchName = "",
        branchCode = "",
        departmentName = "",
        departmentCode = "",
        roomSchedule = null,
    } = page.props;

    const backHref = useMemo(() => {
        const query = page.url.split("?")[1] ?? "";
        const returnTo = new URLSearchParams(query).get("return_to");

        if (returnTo) {
            return returnTo;
        }

        if (roomSchedule?.room_id) {
            return `${route("officer.index")}?room_id=${roomSchedule.room_id}`;
        }

        return route("officer.index");
    }, [page.url, roomSchedule?.room_id]);

    return (
        <>
            <Head title="Schedule > Edit" />

            <Base title="Schedule > Edit">
                <CreateAndEditOfficerSchedule
                    subjects={subjects}
                    professors={professors}
                    currentAcademicPeriod={currentAcademicPeriod}
                    currentAcademicPeriodId={currentAcademicPeriodId}
                    dayOptions={dayOptions}
                    branchName={branchName}
                    branchCode={branchCode}
                    departmentName={departmentName}
                    departmentCode={departmentCode}
                    roomSchedule={roomSchedule}
                    backHref={backHref}
                />
            </Base>
        </>
    );
}
