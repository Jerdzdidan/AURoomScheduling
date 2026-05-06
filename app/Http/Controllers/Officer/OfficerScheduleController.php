<?php

namespace App\Http\Controllers\Officer;

use App\Http\Controllers\Controller;
use App\Models\AcademicPeriod;
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

class OfficerScheduleController extends Controller
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
        $user = auth()->user();
        $department = $user->department;
        $branch = $department?->branch;

        $rooms = $this->getBranchRooms($department);
        $academicPeriods = $this->getAcademicPeriods();

        return inertia('Officer/Index', [
            'rooms' => $rooms,
            'academicPeriods' => $academicPeriods,
            'currentAcademicPeriodId' => AcademicPeriod::query()
                ->where('is_current', true)
                ->value('id'),
            'dayOptions' => $this->getDayOptions(),
            'departmentName' => $department?->name,
            'departmentCode' => $department?->code,
            'branchName' => $branch?->name,
            'branchCode' => $branch?->code,
        ]);
    }

    public function getSchedules(Request $request)
    {
        $user = auth()->user();
        $department = $user->department;
        $departmentId = $user->department_id;

        $validated = $request->validate([
            'room_id' => ['required', 'integer', 'exists:rooms,id'],
            'academic_period_id' => ['required', 'integer', 'exists:academic_periods,id'],
        ]);

        $roomBelongsToBranch = Room::query()
            ->whereKey($validated['room_id'])
            ->whereHas('building', fn($query) => $query->where('branch_id', $department?->branch_id))
            ->exists();

        if (!$roomBelongsToBranch) {
            throw ValidationException::withMessages([
                'room_id' => ['You can only view schedules for rooms in your branch.'],
            ]);
        }

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
            ->map(function ($schedule) use ($departmentId) {
                $isOwn = (int) $schedule->department_id === (int) $departmentId;
                $isCreatedByAdmin = $schedule->creator_user_type === 'ADMIN';

                if ($isOwn) {
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
                        'notes' => $schedule->notes,
                        'is_own' => true,
                        'is_created_by_admin' => $isCreatedByAdmin,
                        'can_delete' => !$isCreatedByAdmin,
                        'created_by_label' => $this->formatCreatorLabel(
                            $schedule->creator_name,
                            $schedule->creator_user_type,
                        ),
                    ];
                }

                return [
                    'id' => null,
                    'day_of_week' => $schedule->day_of_week,
                    'start_time' => substr((string) $schedule->start_time, 0, 5),
                    'end_time' => substr((string) $schedule->end_time, 0, 5),
                    'department_name' => $schedule->department_name,
                    'department_code' => $schedule->department_code,
                    'is_own' => false,
                ];
            });

        return response()->json(['schedules' => $schedules]);
    }

    public function create()
    {
        return inertia('Officer/PageForm/ScheduleCreate', $this->getFormProps());
    }

    public function edit($id)
    {
        $user = auth()->user();

        try {
            $roomSchedule = $this->findScheduleOrFail($id);
        } catch (DecryptException) {
            abort(404);
        }

        $this->ensureOwnDepartment($roomSchedule, $user);

        return inertia('Officer/PageForm/ScheduleEdit', [
            ...$this->getFormProps(),
            'roomSchedule' => $this->serializeSchedule($roomSchedule, $id),
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        $validated = $this->validateSchedule($request, $user);

        RoomSchedule::create([
            ...$this->buildSchedulePayload($validated),
            'created_by_user_id' => $user->id,
        ]);

        return to_route('officer.index', [
            'room_id' => $validated['room_id'],
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = auth()->user();

        try {
            $roomSchedule = $this->findScheduleOrFail($id);
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid room schedule ID.'], 400);
        }

        $this->ensureOwnDepartment($roomSchedule, $user);
        $isAdminCreatedSchedule = $this->isCreatedByAdmin($roomSchedule);

        $validated = $this->validateSchedule($request, $user, $roomSchedule, $isAdminCreatedSchedule);
        $roomSchedule->update($this->buildSchedulePayload($validated));

        return to_route('officer.index', [
            'room_id' => $validated['room_id'],
        ]);
    }

    public function destroy($id)
    {
        $user = auth()->user();

        try {
            $roomSchedule = $this->findScheduleOrFail($id);
        } catch (DecryptException) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid room schedule ID.',
            ], 400);
        }

        $this->ensureOwnDepartment($roomSchedule, $user);
        if ($this->isCreatedByAdmin($roomSchedule)) {
            return response()->json([
                'success' => false,
                'message' => 'Schedules created by an admin cannot be deleted by an officer.',
            ], 403);
        }

        $roomSchedule->delete();

        return response()->json([
            'success' => true,
            'message' => 'Room schedule deleted successfully.',
        ]);
    }

    public function getAvailableRooms(Request $request)
    {
        $user = auth()->user();
        $department = $user->department;
        $branch = $department?->branch;

        $request->merge([
            'day_of_week' => strtoupper((string) $request->input('day_of_week')),
        ]);

        $validated = $request->validate([
            'academic_period_id' => ['required', 'integer', 'exists:academic_periods,id'],
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

        $branchId = $branch?->id;
        $departmentId = $department?->id;

        $conflictingRoomIds = RoomSchedule::query()
            ->where('academic_period_id', $validated['academic_period_id'])
            ->where('day_of_week', $validated['day_of_week'])
            ->when($ignoreSchedule, fn($query) => $query->whereKeyNot($ignoreSchedule->id))
            ->where('start_time', '<', $validated['end_time'])
            ->where('end_time', '>', $validated['start_time'])
            ->pluck('room_id');

        $branchRooms = Room::query()
            ->join('buildings', 'rooms.building_id', '=', 'buildings.id')
            ->where('buildings.branch_id', $branchId)
            ->whereHas('departments', fn($query) => $query->whereKey($departmentId));

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

    // ── Helpers ──────────────────────────────────────────────────

    private function ensureOwnDepartment(RoomSchedule $roomSchedule, $user): void
    {
        $roomSchedule->loadMissing('subject:id,department_id');

        if ((int) $roomSchedule->subject?->department_id !== (int) $user->department_id) {
            abort(403, 'You can only manage schedules within your own department.');
        }
    }

    private function validateSchedule(
        Request $request,
        $user,
        ?RoomSchedule $roomSchedule = null,
        bool $isAdminCreatedSchedule = false,
    ): array
    {
        $department = $user->department;
        $branch = $department?->branch;

        $request->merge([
            'section' => strtoupper(trim((string) $request->input('section'))),
            'day_of_week' => strtoupper((string) $request->input('day_of_week')),
            'notes' => trim((string) $request->input('notes')),
        ]);

        $validated = $request->validate([
            'academic_period_id' => ['required', 'integer', 'exists:academic_periods,id'],
            'subject_id' => [
                'required',
                'integer',
                Rule::exists('subjects', 'id')
                    ->where(fn($query) => $query->where('department_id', $department?->id)),
            ],
            'room_id' => ['required', 'integer', 'exists:rooms,id'],
            'section' => ['required', 'string', 'max:255'],
            'day_of_week' => ['required', 'string', Rule::in(array_keys(self::DAY_LABELS))],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'professor_id' => ['required', 'integer', 'exists:professors,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        // Lock academic period
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

        // Room must belong to the officer's branch
        $roomBelongsToBranch = Room::query()
            ->whereKey($validated['room_id'])
            ->whereHas('building', fn($query) => $query->where('branch_id', $branch?->id))
            ->exists();

        if (!$roomBelongsToBranch) {
            throw ValidationException::withMessages([
                'room_id' => ['The selected room does not belong to your branch.'],
            ]);
        }

        if ($isAdminCreatedSchedule && $roomSchedule) {
            $this->ensureOfficerLockedFieldsUnchanged($validated, $roomSchedule);
        }

        // Room must be assigned to the officer's department
        if (!$isAdminCreatedSchedule) {
            $roomAssignedToDepartment = Room::query()
                ->whereKey($validated['room_id'])
                ->whereHas('departments', fn($query) => $query->whereKey($department?->id))
                ->exists();

            if (!$roomAssignedToDepartment) {
                throw ValidationException::withMessages([
                    'room_id' => ['The selected room is not assigned to your department.'],
                ]);
            }
        }

        // Conflict check
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

        // Inject branch_id and department_id for payload building
        $validated['branch_id'] = $branch?->id;
        $validated['department_id'] = $department?->id;

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

    private function getFormProps(): array
    {
        $user = auth()->user();
        $department = $user->department;
        $branch = $department?->branch;
        $currentAcademicPeriod = $this->getCurrentAcademicPeriod();

        return [
            'subjects' => Subject::query()
                ->where('department_id', $department?->id)
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'class_type', 'department_id']),
            'professors' => Professor::query()
                ->orderBy('name')
                ->get(['id', 'name']),
            'currentAcademicPeriod' => $currentAcademicPeriod,
            'currentAcademicPeriodId' => $currentAcademicPeriod?->id,
            'dayOptions' => $this->getDayOptions(),
            'branchName' => $branch?->name,
            'branchCode' => $branch?->code,
            'departmentName' => $department?->name,
            'departmentCode' => $department?->code,
        ];
    }

    private function ensureOfficerLockedFieldsUnchanged(array $validated, RoomSchedule $roomSchedule): void
    {
        $lockedFieldErrors = [];

        if ((int) $validated['room_id'] !== (int) $roomSchedule->room_id) {
            $lockedFieldErrors['room_id'] = ['Room cannot be changed for schedules created by an admin.'];
        }

        if (($validated['day_of_week'] ?? '') !== ($roomSchedule->day_of_week ?? '')) {
            $lockedFieldErrors['day_of_week'] = ['Day cannot be changed for schedules created by an admin.'];
        }

        if (($validated['start_time'] ?? '') !== substr((string) $roomSchedule->start_time, 0, 5)) {
            $lockedFieldErrors['start_time'] = ['Start time cannot be changed for schedules created by an admin.'];
        }

        if (($validated['end_time'] ?? '') !== substr((string) $roomSchedule->end_time, 0, 5)) {
            $lockedFieldErrors['end_time'] = ['End time cannot be changed for schedules created by an admin.'];
        }

        if (($validated['notes'] ?? '') !== ($roomSchedule->notes ?? '')) {
            $lockedFieldErrors['notes'] = ['Notes cannot be changed for schedules created by an admin.'];
        }

        if (!empty($lockedFieldErrors)) {
            throw ValidationException::withMessages($lockedFieldErrors);
        }
    }

    private function getBranchRooms(?Department $department)
    {
        if (!$department) {
            return [];
        }

        return Room::query()
            ->with(['departments:id'])
            ->join('buildings', 'rooms.building_id', '=', 'buildings.id')
            ->where('buildings.branch_id', $department->branch_id)
            ->orderBy('buildings.name')
            ->orderBy('rooms.code')
            ->get([
                'rooms.id',
                'rooms.code',
                'rooms.type',
                'buildings.id as building_id',
                'buildings.name as building_name',
                'buildings.code as building_code',
            ])
            ->map(fn (Room $room) => [
                'id' => $room->id,
                'code' => $room->code,
                'type' => $room->type,
                'building_id' => $room->building_id,
                'building_name' => $room->building_name,
                'building_code' => $room->building_code,
                'is_assigned_to_department' => $room->departments->contains('id', $department->id),
            ])
            ->values()
            ->all();
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
            ->orderByDesc('id')
            ->get(['id', 'name', 'academic_year', 'semester', 'is_current']);
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
            'room:id,code,type',
            'createdBy:id,name,user_type',
        ]);

        $isCreatedByAdmin = $this->isCreatedByAdmin($roomSchedule);

        return [
            'id' => $encryptedId ?? Crypt::encryptString((string) $roomSchedule->getKey()),
            'academic_period_id' => $roomSchedule->academic_period_id,
            'subject_id' => $roomSchedule->subject_id,
            'room_id' => $roomSchedule->room_id,
            'room_code' => $roomSchedule->room?->code,
            'room_type' => $roomSchedule->room?->type,
            'professor_id' => $roomSchedule->professor_id,
            'section' => $roomSchedule->section,
            'day_of_week' => $roomSchedule->day_of_week,
            'start_time' => substr((string) $roomSchedule->start_time, 0, 5),
            'end_time' => substr((string) $roomSchedule->end_time, 0, 5),
            'notes' => $roomSchedule->notes ?? '',
            'is_created_by_admin' => $isCreatedByAdmin,
            'can_delete' => !$isCreatedByAdmin,
            'created_by_label' => $this->formatCreatorLabel(
                $roomSchedule->createdBy?->name,
                $roomSchedule->createdBy?->user_type,
            ),
        ];
    }

    private function findScheduleOrFail(string $id): RoomSchedule
    {
        $decrypted = Crypt::decryptString($id);

        return RoomSchedule::findOrFail($decrypted);
    }

    private function isCreatedByAdmin(RoomSchedule $roomSchedule): bool
    {
        $roomSchedule->loadMissing('createdBy:id,user_type');

        return $roomSchedule->createdBy?->user_type === 'ADMIN';
    }

    private function formatCreatorLabel(?string $name, ?string $userType): string
    {
        if (!$name && !$userType) {
            return 'Unknown';
        }

        $role = match ($userType) {
            'ADMIN' => 'Admin',
            'OFFICER' => 'Officer',
            default => $userType,
        };

        if ($role && $name) {
            return "{$role} - {$name}";
        }

        return $name ?: ($role ?: 'Unknown');
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
