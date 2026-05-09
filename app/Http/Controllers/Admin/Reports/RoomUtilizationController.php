<?php

namespace App\Http\Controllers\Admin\Reports;

use App\Http\Controllers\Controller;
use App\Models\AcademicPeriod;
use App\Models\Branch;
use App\Models\Building;
use App\Models\Department;
use App\Models\Room;
use App\Models\RoomSchedule;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RoomUtilizationController extends Controller
{
    private const DAY_LABELS = [
        'MONDAY'    => 'Monday',
        'TUESDAY'   => 'Tuesday',
        'WEDNESDAY' => 'Wednesday',
        'THURSDAY'  => 'Thursday',
        'FRIDAY'    => 'Friday',
        'SATURDAY'  => 'Saturday',
        'SUNDAY'    => 'Sunday',
    ];

    public function index()
    {
        return inertia('Admin/Reports/RoomUtilization', [
            'academicPeriods' => AcademicPeriod::query()
                ->latestFirst()
                ->get(['id', 'name', 'academic_year', 'semester', 'is_current']),
            'branches' => Branch::query()
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
            'buildings' => Building::query()
                ->join('branches', 'buildings.branch_id', '=', 'branches.id')
                ->orderBy('branches.name')
                ->orderBy('buildings.name')
                ->get([
                    'buildings.id',
                    'buildings.name',
                    'buildings.code',
                    'buildings.branch_id',
                    'branches.name as branch_name',
                    'branches.code as branch_code',
                ]),
            'dayOptions' => collect(self::DAY_LABELS)
                ->map(fn(string $name, string $id) => ['id' => $id, 'name' => $name])
                ->values(),
            'currentAcademicPeriodId' => AcademicPeriod::query()
                ->where('is_current', true)
                ->value('id'),
        ]);
    }

    public function search(Request $request)
    {
        $request->merge([
            'day_of_week' => strtoupper((string) $request->input('day_of_week')),
        ]);

        $validated = $request->validate([
            'academic_period_id' => ['required', 'integer', 'exists:academic_periods,id'],
            'branch_id'          => ['required', 'integer', 'exists:branches,id'],
            'day_of_week'        => ['required', 'string', Rule::in(array_keys(self::DAY_LABELS))],
            'start_time'         => ['required', 'date_format:H:i'],
            'end_time'           => ['required', 'date_format:H:i', 'after:start_time'],
            'building_id'        => ['nullable', 'integer', 'exists:buildings,id'],
        ]);

        $this->validateTimeWindow($validated['start_time'], 'start_time');
        $this->validateTimeWindow($validated['end_time'], 'end_time');

        // Rooms that have a conflicting schedule in the given window
        $busyRoomIds = RoomSchedule::query()
            ->where('academic_period_id', $validated['academic_period_id'])
            ->where('day_of_week', $validated['day_of_week'])
            ->where('start_time', '<', $validated['end_time'])
            ->where('end_time', '>', $validated['start_time'])
            ->pluck('room_id')
            ->unique()
            ->values();

        // All rooms in the branch (optionally scoped to a building)
        $roomQuery = Room::query()
            ->join('buildings', 'rooms.building_id', '=', 'buildings.id')
            ->where('buildings.branch_id', $validated['branch_id'])
            ->when(
                !empty($validated['building_id']),
                fn($q) => $q->where('rooms.building_id', $validated['building_id'])
            )
            ->orderBy('buildings.code')
            ->orderBy('rooms.code');

        $allRooms = $roomQuery->get([
            'rooms.id',
            'rooms.code',
            'rooms.type',
            'buildings.id as building_id',
            'buildings.name as building_name',
            'buildings.code as building_code',
        ]);

        // Separate into available / busy
        $available = [];
        $busy      = [];

        foreach ($allRooms as $room) {
            $isBusy = $busyRoomIds->contains($room->id);

            $entry = [
                'id'            => $room->id,
                'code'          => $room->code,
                'type'          => $room->type,
                'building_id'   => $room->building_id,
                'building_name' => $room->building_name,
                'building_code' => $room->building_code,
            ];

            if ($isBusy) {
                // Attach the conflicting schedule details
                $schedules = RoomSchedule::query()
                    ->with([
                        'subject:id,name,code,class_type,department_id',
                        'subject.department:id,name,code',
                        'professor:id,name',
                    ])
                    ->where('room_id', $room->id)
                    ->where('academic_period_id', $validated['academic_period_id'])
                    ->where('day_of_week', $validated['day_of_week'])
                    ->where('start_time', '<', $validated['end_time'])
                    ->where('end_time', '>', $validated['start_time'])
                    ->get();

                $entry['schedules'] = $schedules->map(fn($s) => [
                    'subject_code'      => $s->subject?->code ?? '—',
                    'subject_name'      => $s->subject?->name ?? '—',
                    'subject_class_type' => $s->subject?->class_type ?? '',
                    'department_name'    => $s->subject?->department?->name ?? '—',
                    'department_code'    => $s->subject?->department?->code ?? '',
                    'section'           => $s->section,
                    'professor_name'    => $s->professor?->name ?? 'TBA',
                    'start_time'        => substr((string) $s->start_time, 0, 5),
                    'end_time'          => substr((string) $s->end_time, 0, 5),
                ]);

                $busy[] = $entry;
            } else {
                $available[] = $entry;
            }
        }

        $academicPeriod = AcademicPeriod::find($validated['academic_period_id']);

        return response()->json([
            'available'          => $available,
            'busy'               => $busy,
            'total_rooms'        => count($allRooms),
            'available_count'    => count($available),
            'busy_count'         => count($busy),
            'day_label'          => self::DAY_LABELS[$validated['day_of_week']] ?? $validated['day_of_week'],
            'start_time'         => $validated['start_time'],
            'end_time'           => $validated['end_time'],
            'academic_period'    => $academicPeriod?->name ?? '',
        ]);
    }

    // ── helpers ────────────────────────────────────────────────

    private function validateTimeWindow(string $value, string $field): void
    {
        $time    = $this->parseTime($value);
        $minTime = Carbon::createFromFormat('H:i', '07:30');
        $maxTime = Carbon::createFromFormat('H:i', '20:30');

        if ($time->lt($minTime) || $time->gt($maxTime)) {
            throw ValidationException::withMessages([
                $field => ['Schedule times must be between 7:30 AM and 8:30 PM.'],
            ]);
        }
    }

    private function parseTime(string $value): Carbon
    {
        $time   = substr($value, 0, 8);
        $format = strlen($time) === 5 ? 'H:i' : 'H:i:s';

        return Carbon::createFromFormat($format, $time);
    }
}
