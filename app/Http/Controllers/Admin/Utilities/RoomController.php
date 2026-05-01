<?php

namespace App\Http\Controllers\Admin\Utilities;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Building;
use App\Models\Department;
use App\Models\Room;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Yajra\DataTables\DataTables;

class RoomController extends Controller
{
    public function index()
    {
        return inertia('Admin/Utilities/Room', [
            'branches' => Branch::query()
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
            'departments' => Department::query()
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
                ]),
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
        ]);
    }

    public function getData()
    {
        $rooms = Room::query()
            ->with(['departments:id,name,code'])
            ->leftJoin('buildings', 'rooms.building_id', '=', 'buildings.id')
            ->leftJoin('branches', 'buildings.branch_id', '=', 'branches.id')
            ->select([
                'rooms.id',
                'rooms.code',
                'rooms.type',
                'rooms.building_id',
                'buildings.name as building_name',
                'buildings.code as building_code',
                'branches.name as branch_name',
                'branches.code as branch_code',
            ]);

        return DataTables::of($rooms)
            ->filter(function ($query) {
                $search = request()->input('search.value');

                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('rooms.code', 'like', "%{$search}%")
                            ->orWhere('rooms.type', 'like', "%{$search}%")
                            ->orWhere('buildings.name', 'like', "%{$search}%")
                            ->orWhere('buildings.code', 'like', "%{$search}%")
                            ->orWhere('branches.name', 'like', "%{$search}%")
                            ->orWhere('branches.code', 'like', "%{$search}%")
                            ->orWhereHas('departments', function ($departmentQuery) use ($search) {
                                $departmentQuery->where('departments.name', 'like', "%{$search}%")
                                    ->orWhere('departments.code', 'like', "%{$search}%");
                            });
                    });
                }
            })
            ->addColumn('department_assignments', function (Room $room) {
                return $room->departments
                    ->sortBy('code')
                    ->map(fn (Department $department) => [
                        'id' => $department->id,
                        'code' => $department->code,
                        'name' => $department->name,
                    ])
                    ->values()
                    ->all();
            })
            ->editColumn('id', function ($row) {
                return Crypt::encryptString($row->id);
            })
            ->make(true);
    }

    public function getStats()
    {
        return response()->json([
            'total' => Room::count(),
            'buildings_covered' => Room::query()->distinct('building_id')->count('building_id'),
        ]);
    }

    public function show($id)
    {
        try {
            $room = $this->findRoomOrFail($id);

            return response()->json([
                'id' => $id,
                'code' => $room->code,
                'type' => $room->type,
                'building_id' => $room->building_id,
                'branch_id' => $room->building?->branch_id,
                'department_ids' => $room->departments->pluck('id')->map(fn ($id) => (string) $id)->values()->all(),
            ]);
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid room ID.'], 400);
        }
    }

    public function store(Request $request)
    {
        $validated = $this->validateRoom($request);
        $room = Room::create($this->buildRoomPayload($validated));
        $room->departments()->sync($validated['department_ids']);

        return redirect()->back()->with('success', 'Room created successfully.');
    }

    public function update(Request $request, $id)
    {
        try {
            $room = $this->findRoomOrFail($id);
            $validated = $this->validateRoom($request, $room);
            $this->ensureScheduledDepartmentsRemainAssigned($room, $validated['department_ids']);

            $room->update($this->buildRoomPayload($validated));
            $room->departments()->sync($validated['department_ids']);

            return redirect()->back()->with('success', 'Room updated successfully.');
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid room ID.'], 400);
        }
    }

    public function destroy($id)
    {
        try {
            $room = $this->findRoomOrFail($id);

            if ($room->schedules()->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This room cannot be deleted while it still has schedules.',
                ], 422);
            }

            $room->delete();

            return response()->json([
                'success' => true,
                'message' => 'Room deleted successfully.',
            ]);
        } catch (DecryptException) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid room ID.',
            ], 400);
        }
    }

    private function validateRoom(Request $request, ?Room $room = null): array
    {
        $request->merge([
            'code' => strtoupper(trim((string) $request->input('code'))),
        ]);

        return $request->validate([
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'code' => [
                'required',
                'string',
                'max:255',
                Rule::unique('rooms', 'code')
                    ->where(fn($query) => $query->where('building_id', $request->input('building_id')))
                    ->ignore($room?->id),
            ],
            'type' => ['required', 'string', 'max:255'],
            'building_id' => [
                'required',
                'integer',
                Rule::exists('buildings', 'id')
                    ->where(fn($query) => $query->where('branch_id', $request->input('branch_id'))),
            ],
            'department_ids' => ['required', 'array', 'min:1'],
            'department_ids.*' => [
                'integer',
                Rule::exists('departments', 'id')
                    ->where(fn($query) => $query->where('branch_id', $request->input('branch_id'))),
            ],
        ]);
    }

    private function buildRoomPayload(array $validated): array
    {
        return [
            'code' => $validated['code'],
            'type' => $validated['type'],
            'building_id' => (int) $validated['building_id'],
        ];
    }

    private function ensureScheduledDepartmentsRemainAssigned(Room $room, array $departmentIds): void
    {
        $departmentIds = collect($departmentIds)->map(fn ($id) => (int) $id);

        $scheduledDepartmentIds = $room->schedules()
            ->join('subjects', 'room_schedules.subject_id', '=', 'subjects.id')
            ->distinct()
            ->pluck('subjects.department_id')
            ->map(fn ($id) => (int) $id);

        $missingDepartmentIds = $scheduledDepartmentIds
            ->reject(fn ($departmentId) => $departmentIds->contains($departmentId))
            ->values();

        if ($missingDepartmentIds->isEmpty()) {
            return;
        }

        $departmentLabels = Department::query()
            ->whereIn('id', $missingDepartmentIds)
            ->orderBy('code')
            ->get(['code', 'name'])
            ->map(fn (Department $department) => "{$department->code} - {$department->name}")
            ->implode(', ');

        throw ValidationException::withMessages([
            'department_ids' => ["This room already has schedules under {$departmentLabels}. Keep those department assignments or move/delete the schedules first."],
        ]);
    }

    private function findRoomOrFail(string $id): Room
    {
        $decrypted = Crypt::decryptString($id);

        return Room::with(['building', 'departments', 'schedules'])->findOrFail($decrypted);
    }
}
