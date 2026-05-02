import { Head, usePage } from "@inertiajs/react";
import Base from "@/Layouts/Base";
import CreateAndEditRoomSchedule from "../Forms/CreateAndEditRoomSchedule";

export default function RoomScheduleEdit() {
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
    } = usePage().props;

    return (
        <>
            <Head title="Core > Room Schedule > Edit" />

            <Base title="Core > Room Schedule > Edit">
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
                />
            </Base>
        </>
    );
}
