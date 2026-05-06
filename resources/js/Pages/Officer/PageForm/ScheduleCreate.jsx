import { Head, usePage } from "@inertiajs/react";
import Base from "@/Layouts/Base";
import CreateAndEditOfficerSchedule from "../Forms/CreateAndEditOfficerSchedule";

export default function ScheduleCreate() {
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
    } = usePage().props;

    return (
        <>
            <Head title="Schedule > Create" />

            <Base title="Schedule > Create">
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
                />
            </Base>
        </>
    );
}
