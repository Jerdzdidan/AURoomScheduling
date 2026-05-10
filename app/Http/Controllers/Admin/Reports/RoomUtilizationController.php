<?php

namespace App\Http\Controllers\Admin\Reports;

use App\Http\Controllers\Controller;
use App\Models\AcademicPeriod;
use App\Models\Branch;
use App\Models\Building;
use App\Models\Department;
use App\Models\Professor;
use App\Models\Room;
use App\Models\RoomSchedule;
use App\Models\Subject;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class RoomUtilizationController extends Controller
{
    private const SEARCH_FILTERS_SESSION_KEY = 'admin.reports.room_utilization.search_filters';
    private const GRID_CONTEXT_SESSION_KEY = 'admin.reports.room_utilization.grid_context';
    private const RESTORE_FILTERS_FLASH_KEY = 'admin.reports.room_utilization.restore_filters';

    private const DAY_LABELS = [
        'MONDAY'    => 'Monday',
        'TUESDAY'   => 'Tuesday',
        'WEDNESDAY' => 'Wednesday',
        'THURSDAY'  => 'Thursday',
        'FRIDAY'    => 'Friday',
        'SATURDAY'  => 'Saturday',
        'SUNDAY'    => 'Sunday',
    ];

    public function index(Request $request)
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
            'initialFilters' => $this->getInitialFilters($request),
        ]);
    }

    public function search(Request $request)
    {
        $validated = $this->validateSearchFilters($request);

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

    public function openGrid(Request $request)
    {
        $request->merge([
            'day_of_week' => strtoupper((string) $request->input('day_of_week')),
        ]);

        $validated = $request->validate([
            ...$this->getSearchRules(),
            'room_id' => ['required', 'integer', 'exists:rooms,id'],
        ]);

        $this->validateTimeWindow($validated['start_time'], 'start_time');
        $this->validateTimeWindow($validated['end_time'], 'end_time');

        $roomBelongsToScope = Room::query()
            ->whereKey($validated['room_id'])
            ->whereHas('building', function ($query) use ($validated) {
                $query->where('branch_id', $validated['branch_id']);

                if (!empty($validated['building_id'])) {
                    $query->whereKey($validated['building_id']);
                }
            })
            ->exists();

        if (!$roomBelongsToScope) {
            throw ValidationException::withMessages([
                'room_id' => ['The selected room is no longer available in the chosen branch/building scope.'],
            ]);
        }

        $this->storeGridContext($request, $validated);
        $request->session()->put(
            self::SEARCH_FILTERS_SESSION_KEY,
            $this->normalizeSearchFilters($validated),
        );

        return to_route('admin.reports.room-utilization.grid');
    }

    public function returnFromGrid(Request $request)
    {
        $request->session()->flash(self::RESTORE_FILTERS_FLASH_KEY, true);

        return to_route('admin.reports.room-utilization.index');
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

    public function grid(Request $request)
    {
        $validated = $this->resolveGridContext($request);

        if (!$validated) {
            return to_route('admin.reports.room-utilization.index');
        }

        $this->storeGridContext($request, $validated);

        $room = Room::query()
            ->join('buildings', 'rooms.building_id', '=', 'buildings.id')
            ->leftJoin('branches', 'buildings.branch_id', '=', 'branches.id')
            ->select([
                'rooms.id',
                'rooms.code',
                'rooms.type',
                'buildings.name as building_name',
                'buildings.code as building_code',
                'branches.id as branch_id',
                'branches.name as branch_name',
                'branches.code as branch_code',
            ])
            ->findOrFail($validated['room_id']);

        $academicPeriod = AcademicPeriod::findOrFail($validated['academic_period_id']);

        $schedules = RoomSchedule::query()
            ->join('subjects', 'room_schedules.subject_id', '=', 'subjects.id')
            ->join('departments', 'subjects.department_id', '=', 'departments.id')
            ->leftJoin('professors', 'room_schedules.professor_id', '=', 'professors.id')
            ->leftJoin('users as creators', 'room_schedules.created_by_user_id', '=', 'creators.id')
            ->where('room_schedules.room_id', $validated['room_id'])
            ->where('room_schedules.academic_period_id', $validated['academic_period_id'])
            ->select([
                'room_schedules.id',
                'room_schedules.day_of_week',
                'room_schedules.start_time',
                'room_schedules.end_time',
                'room_schedules.section',
                'room_schedules.notes',
                'subjects.name as subject_name',
                'subjects.code as subject_code',
                'subjects.class_type as subject_class_type',
                'subjects.department_id',
                'departments.name as department_name',
                'departments.code as department_code',
                'professors.name as professor_name',
                'creators.name as creator_name',
                'creators.user_type as creator_user_type',
            ])
            ->orderBy('room_schedules.day_of_week')
            ->orderBy('room_schedules.start_time')
            ->get()
            ->map(function ($schedule) {
                $creatorLabel = $schedule->creator_name
                    ? $schedule->creator_name . ($schedule->creator_user_type === 'ADMIN' ? ' (Admin)' : ' (Officer)')
                    : 'System';

                return [
                    'id' => Crypt::encryptString((string) $schedule->id),
                    'day_of_week' => $schedule->day_of_week,
                    'start_time' => substr((string) $schedule->start_time, 0, 5),
                    'end_time' => substr((string) $schedule->end_time, 0, 5),
                    'subject_name' => $schedule->subject_name,
                    'subject_code' => $schedule->subject_code,
                    'subject_class_type' => $schedule->subject_class_type,
                    'section' => $schedule->section,
                    'professor_name' => $schedule->professor_name,
                    'department_name' => $schedule->department_name,
                    'department_code' => $schedule->department_code,
                    'notes' => $schedule->notes,
                    'created_by_label' => $creatorLabel,
                ];
            });

        return Inertia::render('Admin/Reports/RoomUtilizationGrid', [
            'room' => $room,
            'academicPeriod' => $academicPeriod,
            'schedules' => $schedules,
            'dayOptions' => collect(self::DAY_LABELS)->map(fn($name, $id) => ['id' => $id, 'name' => $name])->values(),
            'branches' => $this->getBranches(),
            'departments' => $this->getDepartments(),
            'subjects' => $this->getSubjects(),
            'professors' => Professor::query()
                ->orderBy('name')
                ->get(['id', 'name']),
            'currentAcademicPeriodId' => AcademicPeriod::query()
                ->where('is_current', true)
                ->value('id'),
        ]);
    }

    private function getSearchRules(): array
    {
        return [
            'academic_period_id' => ['required', 'integer', 'exists:academic_periods,id'],
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'day_of_week' => ['required', 'string', Rule::in(array_keys(self::DAY_LABELS))],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'building_id' => ['nullable', 'integer', 'exists:buildings,id'],
        ];
    }

    private function validateSearchFilters(Request $request): array
    {
        $request->merge([
            'day_of_week' => strtoupper((string) $request->input('day_of_week')),
        ]);

        $validated = $request->validate($this->getSearchRules());

        $this->validateTimeWindow($validated['start_time'], 'start_time');
        $this->validateTimeWindow($validated['end_time'], 'end_time');

        return $validated;
    }

    private function getInitialFilters(Request $request): array
    {
        $defaults = $this->emptySearchFilters();
        $queryFilters = $request->only(array_keys($defaults));
        $hasQueryFilters = collect($queryFilters)->contains(
            fn($value) => $value !== null && $value !== ''
        );

        if ($hasQueryFilters) {
            $source = $queryFilters;
        } elseif ($request->session()->get(self::RESTORE_FILTERS_FLASH_KEY)) {
            $source = $request->session()->get(self::SEARCH_FILTERS_SESSION_KEY, []);
        } else {
            $source = [];
        }

        return array_merge($defaults, $this->normalizeSearchFilters(is_array($source) ? $source : []));
    }

    private function emptySearchFilters(): array
    {
        return [
            'academic_period_id' => '',
            'branch_id' => '',
            'building_id' => '',
            'day_of_week' => '',
            'start_time' => '',
            'end_time' => '',
        ];
    }

    private function normalizeSearchFilters(array $filters): array
    {
        $defaults = $this->emptySearchFilters();

        return [
            'academic_period_id' => isset($filters['academic_period_id']) && $filters['academic_period_id'] !== ''
                ? (string) $filters['academic_period_id']
                : $defaults['academic_period_id'],
            'branch_id' => isset($filters['branch_id']) && $filters['branch_id'] !== ''
                ? (string) $filters['branch_id']
                : $defaults['branch_id'],
            'building_id' => isset($filters['building_id']) && $filters['building_id'] !== ''
                ? (string) $filters['building_id']
                : $defaults['building_id'],
            'day_of_week' => !empty($filters['day_of_week'])
                ? strtoupper((string) $filters['day_of_week'])
                : $defaults['day_of_week'],
            'start_time' => !empty($filters['start_time'])
                ? substr((string) $filters['start_time'], 0, 5)
                : $defaults['start_time'],
            'end_time' => !empty($filters['end_time'])
                ? substr((string) $filters['end_time'], 0, 5)
                : $defaults['end_time'],
        ];
    }

    private function storeGridContext(Request $request, array $validated): void
    {
        $request->session()->put(self::GRID_CONTEXT_SESSION_KEY, [
            'room_id' => (int) $validated['room_id'],
            'academic_period_id' => (int) $validated['academic_period_id'],
        ]);
    }

    private function resolveGridContext(Request $request): ?array
    {
        $rules = [
            'room_id' => ['required', 'integer', 'exists:rooms,id'],
            'academic_period_id' => ['required', 'integer', 'exists:academic_periods,id'],
        ];

        if ($request->filled('room_id') || $request->filled('academic_period_id')) {
            return $request->validate($rules);
        }

        $stored = $request->session()->get(self::GRID_CONTEXT_SESSION_KEY);

        if (!is_array($stored)) {
            return null;
        }

        $validator = validator($stored, $rules);

        if ($validator->fails()) {
            $request->session()->forget(self::GRID_CONTEXT_SESSION_KEY);

            return null;
        }

        return $validator->validated();
    }

    private function getBranches()
    {
        return Branch::query()
            ->orderBy('name')
            ->get(['id', 'name', 'code']);
    }

    private function getDepartments()
    {
        return Department::query()
            ->join('branches', 'departments.branch_id', '=', 'branches.id')
            ->orderBy('branches.name')
            ->orderBy('departments.name')
            ->get([
                'departments.id',
                'departments.name',
                'departments.code',
                'departments.branch_id',
                'branches.name as branch_name',
                'branches.code as branch_code',
            ]);
    }

    private function getSubjects()
    {
        return Subject::query()
            ->join('departments', 'subjects.department_id', '=', 'departments.id')
            ->join('branches', 'departments.branch_id', '=', 'branches.id')
            ->orderBy('branches.name')
            ->orderBy('departments.name')
            ->orderBy('subjects.name')
            ->get([
                'subjects.id',
                'subjects.name',
                'subjects.code',
                'subjects.class_type',
                'subjects.department_id',
                'departments.name as department_name',
                'departments.code as department_code',
                'departments.branch_id',
                'branches.name as branch_name',
                'branches.code as branch_code',
            ]);
    }
}
