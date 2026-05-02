import { Head, usePage } from "@inertiajs/react";
import Base from "@/Layouts/Base";
import CreateAndEditRoomSchedule from "../Forms/CreateAndEditRoomSchedule";

export default function RoomScheduleCreate() {
    const {
        academicPeriods = [],
        branches = [],
        departments = [],
        subjects = [],
        professors = [],
        currentAcademicPeriod = null,
        currentAcademicPeriodId = null,
        dayOptions = [],
    } = usePage().props;

    return (
        <>
            <Head title="Core > Room Schedule > Create" />

            <Base title="Core > Room Schedule > Create">
                <CreateAndEditRoomSchedule
                    academicPeriods={academicPeriods}
                    branches={branches}
                    departments={departments}
                    subjects={subjects}
                    professors={professors}
                    currentAcademicPeriod={currentAcademicPeriod}
                    currentAcademicPeriodId={currentAcademicPeriodId}
                    dayOptions={dayOptions}
                />
            </Base>
        </>
    );
}
