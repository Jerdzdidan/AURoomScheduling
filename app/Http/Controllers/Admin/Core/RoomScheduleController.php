<?php

namespace App\Http\Controllers\Admin\Core;

use App\Http\Controllers\Controller;
use App\Models\AcademicPeriod;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Professor;
use App\Models\Room;
use App\Models\RoomSchedule;
use App\Models\Subject;
use Carbon\Carbon;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Yajra\DataTables\DataTables;

class RoomScheduleController extends Controller
{
    private const DAY_LABELS = [
        'MONDAY' => 'Monday',
        'TUESDAY' => 'Tuesday',
        'WEDNESDAY' => 'Wednesday',
        'THURSDAY' => 'Thursday',
        'FRIDAY' => 'Friday',
        'SATURDAY' => 'Saturday',
        'SUNDAY' => 'Sunday',
    ];

    public function index()
    {
        return inertia('Admin/Core/RoomSchedule', $this->getIndexProps());
    }

    public function create()
    {
        return inertia('Admin/Core/PageForm/RoomScheduleCreate', $this->getFormProps());
    }

    public function edit($id)
    {
        try {
            $roomSchedule = $this->findScheduleOrFail($id);
        } catch (DecryptException) {
            abort(404);
        }

        return inertia('Admin/Core/PageForm/RoomScheduleEdit', [
            ...$this->getFormProps(),
            'roomSchedule' => $this->serializeSchedule($roomSchedule, $id),
        ]);
    }

    public function getData()
    {
        $roomSchedules = RoomSchedule::query()
            ->join('academic_periods', 'room_schedules.academic_period_id', '=', 'academic_periods.id')
            ->join('subjects', 'room_schedules.subject_id', '=', 'subjects.id')
            ->join('departments', 'subjects.department_id', '=', 'departments.id')
            ->join('branches', 'departments.branch_id', '=', 'branches.id')
            ->join('rooms', 'room_schedules.room_id', '=', 'rooms.id')
            ->leftJoin('buildings', 'rooms.building_id', '=', 'buildings.id')
            ->leftJoin('professors', 'room_schedules.professor_id', '=', 'professors.id')
            ->select([
                'room_schedules.id',
                'room_schedules.section',
                'room_schedules.day_of_week',
                'room_schedules.start_time',
                'room_schedules.end_time',
                'room_schedules.notes',
                'room_schedules.academic_period_id',
                'room_schedules.subject_id',
                'room_schedules.room_id',
                'academic_periods.name as academic_period_name',
                'academic_periods.academic_year as academic_period_academic_year',
                'academic_periods.semester as academic_period_semester',
                'academic_periods.is_current as is_current_period',
                'subjects.name as subject_name',
                'subjects.code as subject_code',
                'departments.name as department_name',
                'departments.code as department_code',
                'branches.name as branch_name',
                'branches.code as branch_code',
                'rooms.code as room_code',
                'rooms.type as room_type',
                'buildings.name as building_name',
                'buildings.code as building_code',
                'professors.name as professor_name',
            ]);

        if ($academicPeriodId = request()->input('filter_academic_period_id')) {
            $roomSchedules->where('room_schedules.academic_period_id', $academicPeriodId);
        }

        if ($branchId = request()->input('filter_branch_id')) {
            $roomSchedules->where('branches.id', $branchId);
        }

        if ($departmentId = request()->input('filter_department_id')) {
            $roomSchedules->where('departments.id', $departmentId);
        }

        if ($subjectId = request()->input('filter_subject_id')) {
            $roomSchedules->where('subjects.id', $subjectId);
        }

        if ($dayOfWeek = request()->input('filter_day_of_week')) {
            $roomSchedules->where('room_schedules.day_of_week', $dayOfWeek);
        }

        if ($roomId = request()->input('filter_room_id')) {
            $roomSchedules->where('rooms.id', $roomId);
        }

        return DataTables::of($roomSchedules)
            ->filter(function ($query) {
                $search = request()->input('search.value');

                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('academic_periods.name', 'like', "%{$search}%")
                            ->orWhere('subjects.name', 'like', "%{$search}%")
                            ->orWhere('subjects.code', 'like', "%{$search}%")
                            ->orWhere('departments.name', 'like', "%{$search}%")
                            ->orWhere('departments.code', 'like', "%{$search}%")
                            ->orWhere('branches.name', 'like', "%{$search}%")
                            ->orWhere('branches.code', 'like', "%{$search}%")
                            ->orWhere('rooms.code', 'like', "%{$search}%")
                            ->orWhere('buildings.name', 'like', "%{$search}%")
                            ->orWhere('buildings.code', 'like', "%{$search}%")
                            ->orWhere('professors.name', 'like', "%{$search}%")
                            ->orWhere('room_schedules.section', 'like', "%{$search}%")
                            ->orWhere('room_schedules.day_of_week', 'like', "%{$search}%");
                    });
                }
            })
            ->editColumn('id', function ($row) {
                return Crypt::encryptString((string) $row->id);
            })
            ->make(true);
    }

    public function getStats()
    {
        $currentAcademicPeriodId = AcademicPeriod::query()
            ->where('is_current', true)
            ->value('id');

        return response()->json([
            'total' => RoomSchedule::count(),
            'current_period' => $currentAcademicPeriodId
                ? RoomSchedule::query()->where('academic_period_id', $currentAcademicPeriodId)->count()
                : 0,
            'rooms_in_use' => RoomSchedule::query()->distinct('room_id')->count('room_id'),
        ]);
    }

    public function getAvailableRooms(Request $request)
    {
        $request->merge([
            'day_of_week' => strtoupper((string) $request->input('day_of_week')),
        ]);

        $validated = $request->validate([
            'academic_period_id' => ['required', 'integer', 'exists:academic_periods,id'],
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'day_of_week' => ['required', 'string', Rule::in(array_keys(self::DAY_LABELS))],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'schedule_id' => ['nullable', 'string'],
        ]);

        $this->validateTimeWindow($validated['start_time'], 'start_time');
        $this->validateTimeWindow($validated['end_time'], 'end_time');

        try {
            $ignoreSchedule = $request->filled('schedule_id')
                ? $this->findScheduleOrFail((string) $request->input('schedule_id'))
                : null;
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid room schedule ID.'], 400);
        }

        $conflictingRoomIds = RoomSchedule::query()
            ->where('academic_period_id', $validated['academic_period_id'])
            ->where('day_of_week', $validated['day_of_week'])
            ->when($ignoreSchedule, fn($query) => $query->whereKeyNot($ignoreSchedule->id))
            ->where('start_time', '<', $validated['end_time'])
            ->where('end_time', '>', $validated['start_time'])
            ->pluck('room_id');

        $branchRooms = Room::query()
            ->join('buildings', 'rooms.building_id', '=', 'buildings.id')
            ->where('buildings.branch_id', $validated['branch_id']);

        $totalRooms = (clone $branchRooms)->count();

        $rooms = $branchRooms
            ->when($conflictingRoomIds->isNotEmpty(), fn($query) => $query->whereNotIn('rooms.id', $conflictingRoomIds))
            ->orderBy('buildings.code')
            ->orderBy('rooms.code')
            ->get([
                'rooms.id',
                'rooms.code',
                'rooms.type',
                'buildings.name as building_name',
                'buildings.code as building_code',
            ]);

        return response()->json([
            'total_rooms' => $totalRooms,
            'available_count' => $rooms->count(),
            'rooms' => $rooms,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateSchedule($request);

        RoomSchedule::create([
            ...$this->buildSchedulePayload($validated),
            'created_by_user_id' => auth()->id(),
        ]);

        return to_route('admin.core.room-schedules.index');
    }

    public function update(Request $request, $id)
    {
        try {
            $roomSchedule = $this->findScheduleOrFail($id);
            $validated = $this->validateSchedule($request, $roomSchedule);

            $roomSchedule->update($this->buildSchedulePayload($validated));

            return to_route('admin.core.room-schedules.index');
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid room schedule ID.'], 400);
        }
    }

    public function destroy($id)
    {
        try {
            $roomSchedule = $this->findScheduleOrFail($id);
            $roomSchedule->delete();

            return response()->json([
                'success' => true,
                'message' => 'Room schedule deleted successfully.',
            ]);
        } catch (DecryptException) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid room schedule ID.',
            ], 400);
        }
    }

    private function validateSchedule(Request $request, ?RoomSchedule $roomSchedule = null): array
    {
        $request->merge([
            'section' => strtoupper(trim((string) $request->input('section'))),
            'day_of_week' => strtoupper((string) $request->input('day_of_week')),
            'notes' => trim((string) $request->input('notes')),
        ]);

        $validated = $request->validate([
            'academic_period_id' => ['required', 'integer', 'exists:academic_periods,id'],
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'department_id' => [
                'required',
                'integer',
                Rule::exists('departments', 'id')
                    ->where(fn($query) => $query->where('branch_id', $request->input('branch_id'))),
            ],
            'subject_id' => [
                'required',
                'integer',
                Rule::exists('subjects', 'id')
                    ->where(fn($query) => $query->where('department_id', $request->input('department_id'))),
            ],
            'room_id' => ['required', 'integer', 'exists:rooms,id'],
            'section' => ['required', 'string', 'max:255'],
            'day_of_week' => ['required', 'string', Rule::in(array_keys(self::DAY_LABELS))],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'professor_id' => ['required', 'integer', 'exists:professors,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $lockedAcademicPeriodId = $roomSchedule
            ? (int) $roomSchedule->academic_period_id
            : (int) (AcademicPeriod::query()->where('is_current', true)->value('id') ?? 0);

        if (!$lockedAcademicPeriodId) {
            throw ValidationException::withMessages([
                'academic_period_id' => ['Set a current academic period first before adding room schedules.'],
            ]);
        }

        if ((int) $validated['academic_period_id'] !== $lockedAcademicPeriodId) {
            throw ValidationException::withMessages([
                'academic_period_id' => [$roomSchedule
                    ? 'Academic period cannot be changed when editing a room schedule.'
                    : 'New room schedules can only be created for the current academic period.'],
            ]);
        }

        $this->validateTimeWindow($validated['start_time'], 'start_time');
        $this->validateTimeWindow($validated['end_time'], 'end_time');

        $roomBelongsToBranch = Room::query()
            ->whereKey($validated['room_id'])
            ->whereHas('building', fn($query) => $query->where('branch_id', $validated['branch_id']))
            ->exists();

        if (!$roomBelongsToBranch) {
            throw ValidationException::withMessages([
                'room_id' => ['The selected room does not belong to the chosen branch.'],
            ]);
        }

        $conflict = RoomSchedule::query()
            ->with(['subject:id,name,code', 'room:id,code'])
            ->where('academic_period_id', $validated['academic_period_id'])
            ->where('room_id', $validated['room_id'])
            ->where('day_of_week', $validated['day_of_week'])
            ->when($roomSchedule, fn($query) => $query->whereKeyNot($roomSchedule->id))
            ->where('start_time', '<', $validated['end_time'])
            ->where('end_time', '>', $validated['start_time'])
            ->first();

        if ($conflict) {
            $dayLabel = self::DAY_LABELS[$validated['day_of_week']] ?? $validated['day_of_week'];
            $timeLabel = $this->formatTimeRange($conflict->start_time, $conflict->end_time);
            $subjectLabel = trim(($conflict->subject?->code ?? '') . ' ' . ($conflict->section ?? ''));

            throw ValidationException::withMessages([
                'room_id' => ['The selected room is already taken on ' . $dayLabel . ' at ' . $timeLabel . ' for ' . $subjectLabel . '.'],
            ]);
        }

        return $validated;
    }

    private function buildSchedulePayload(array $validated): array
    {
        return [
            'academic_period_id' => (int) $validated['academic_period_id'],
            'subject_id' => (int) $validated['subject_id'],
            'room_id' => (int) $validated['room_id'],
            'professor_id' => (int) $validated['professor_id'],
            'section' => $validated['section'],
            'day_of_week' => $validated['day_of_week'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'notes' => $validated['notes'] ?: null,
        ];
    }

    private function getIndexProps(): array
    {
        return [
            'academicPeriods' => $this->getAcademicPeriods(),
            'branches' => $this->getBranches(),
            'departments' => $this->getDepartments(),
            'subjects' => $this->getSubjects(),
            'rooms' => $this->getRooms(),
            'dayOptions' => $this->getDayOptions(),
        ];
    }

    private function getFormProps(): array
    {
        $currentAcademicPeriod = $this->getCurrentAcademicPeriod();

        return [
            'academicPeriods' => $this->getAcademicPeriods(),
            'branches' => $this->getBranches(),
            'departments' => $this->getDepartments(),
            'subjects' => $this->getSubjects(),
            'professors' => Professor::query()
                ->orderBy('name')
                ->get(['id', 'name']),
            'currentAcademicPeriod' => $currentAcademicPeriod,
            'currentAcademicPeriodId' => $currentAcademicPeriod?->id,
            'dayOptions' => $this->getDayOptions(),
        ];
    }

    private function getCurrentAcademicPeriod(): ?AcademicPeriod
    {
        return AcademicPeriod::query()
            ->where('is_current', true)
            ->first(['id', 'name', 'academic_year', 'semester', 'is_current']);
    }

    private function getAcademicPeriods()
    {
        return AcademicPeriod::query()
            ->latestFirst()
            ->get(['id', 'name', 'academic_year', 'semester']);
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

    private function getRooms()
    {
        return Room::query()
            ->with(['departments:id'])
            ->join('buildings', 'rooms.building_id', '=', 'buildings.id')
            ->join('branches', 'buildings.branch_id', '=', 'branches.id')
            ->orderBy('branches.name')
            ->orderBy('buildings.name')
            ->orderBy('rooms.code')
            ->get([
                'rooms.id',
                'rooms.code',
                'rooms.type',
                'buildings.id as building_id',
                'buildings.name as building_name',
                'buildings.code as building_code',
                'branches.id as branch_id',
                'branches.name as branch_name',
                'branches.code as branch_code',
            ])
            ->map(fn (Room $room) => [
                'id' => $room->id,
                'code' => $room->code,
                'type' => $room->type,
                'building_id' => $room->building_id,
                'building_name' => $room->building_name,
                'building_code' => $room->building_code,
                'branch_id' => $room->branch_id,
                'branch_name' => $room->branch_name,
                'branch_code' => $room->branch_code,
                'department_ids' => $room->departments->pluck('id')->map(fn ($id) => (string) $id)->values()->all(),
            ])
            ->values();
    }

    private function getDayOptions()
    {
        return collect(self::DAY_LABELS)
            ->map(fn(string $name, string $id) => ['id' => $id, 'name' => $name])
            ->values();
    }

    private function serializeSchedule(RoomSchedule $roomSchedule, ?string $encryptedId = null): array
    {
        $roomSchedule->loadMissing([
            'subject:id,department_id',
            'subject.department:id,branch_id',
        ]);

        return [
            'id' => $encryptedId ?? Crypt::encryptString((string) $roomSchedule->getKey()),
            'academic_period_id' => $roomSchedule->academic_period_id,
            'branch_id' => $roomSchedule->subject?->department?->branch_id,
            'department_id' => $roomSchedule->subject?->department_id,
            'subject_id' => $roomSchedule->subject_id,
            'room_id' => $roomSchedule->room_id,
            'professor_id' => $roomSchedule->professor_id,
            'section' => $roomSchedule->section,
            'day_of_week' => $roomSchedule->day_of_week,
            'start_time' => substr((string) $roomSchedule->start_time, 0, 5),
            'end_time' => substr((string) $roomSchedule->end_time, 0, 5),
            'notes' => $roomSchedule->notes ?? '',
        ];
    }

    private function findScheduleOrFail(string $id): RoomSchedule
    {
        $decrypted = Crypt::decryptString($id);

        return RoomSchedule::findOrFail($decrypted);
    }

    private function formatTimeRange(string $startTime, string $endTime): string
    {
        return $this->parseTime($startTime)
            ->format('g:i A')
            . ' - '
            . $this->parseTime($endTime)
            ->format('g:i A');
    }

    private function parseTime(string $value): Carbon
    {
        $time = substr($value, 0, 8);
        $format = strlen($time) === 5 ? 'H:i' : 'H:i:s';

        return Carbon::createFromFormat($format, $time);
    }

    private function validateTimeWindow(string $value, string $field): void
    {
        $time = $this->parseTime($value);
        $minTime = Carbon::createFromFormat('H:i', '07:30');
        $maxTime = Carbon::createFromFormat('H:i', '20:30');

        if ($time->lt($minTime) || $time->gt($maxTime)) {
            throw ValidationException::withMessages([
                $field => ['Schedule times must be between 7:30 AM and 8:30 PM.'],
            ]);
        }
    }
}
