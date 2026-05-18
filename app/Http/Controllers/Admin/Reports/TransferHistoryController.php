<?php

namespace App\Http\Controllers\Admin\Reports;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Room;
use App\Models\ScheduleTransfer;
use App\Models\User;
use Illuminate\Http\Request;
use Yajra\DataTables\DataTables;

class TransferHistoryController extends Controller
{
    private const DAY_OPTIONS = [
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
        return inertia('Admin/Reports/TransferScheduleHistory', [
            'branches' => Branch::query()->orderBy('name')->get(['id', 'name', 'code']),
            'departments' => Department::query()
                ->join('branches', 'departments.branch_id', '=', 'branches.id')
                ->orderBy('branches.name')
                ->orderBy('departments.name')
                ->get([
                    'departments.id',
                    'departments.name',
                    'departments.code',
                    'departments.branch_id',
                ]),
            'dayOptions' => collect(self::DAY_OPTIONS)
                ->map(fn ($name, $id) => ['id' => $id, 'name' => $name])
                ->values(),
            'rooms' => Room::query()
                ->join('buildings', 'rooms.building_id', '=', 'buildings.id')
                ->join('branches', 'buildings.branch_id', '=', 'branches.id')
                ->orderBy('branches.name')
                ->orderBy('buildings.name')
                ->orderBy('rooms.code')
                ->get([
                    'rooms.id',
                    'rooms.code',
                    'rooms.type',
                    'buildings.name as building_name',
                    'buildings.code as building_code',
                    'branches.id as branch_id',
                ])
                ->map(fn ($room) => [
                    'id' => $room->id,
                    'code' => $room->code,
                    'name' => $room->code,
                    'type' => $room->type,
                    'building_name' => $room->building_name,
                    'building_code' => $room->building_code,
                    'branch_id' => $room->branch_id,
                ])
                ->values(),
            'adminUsers' => User::query()
                ->where('user_type', 'Admin')
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function getStats()
    {
        return response()->json([
            'total' => ScheduleTransfer::count(),
        ]);
    }

    public function getData()
    {
        $transfers = ScheduleTransfer::query()
            ->join('room_schedules', 'schedule_transfers.room_schedule_id', '=', 'room_schedules.id')
            ->join('subjects', 'room_schedules.subject_id', '=', 'subjects.id')
            ->join('departments', 'subjects.department_id', '=', 'departments.id')
            ->join('branches', 'departments.branch_id', '=', 'branches.id')
            ->join('rooms as prev_room', 'schedule_transfers.previous_room_id', '=', 'prev_room.id')
            ->leftJoin('buildings as prev_building', 'prev_room.building_id', '=', 'prev_building.id')
            ->join('rooms as trans_room', 'schedule_transfers.transferred_room_id', '=', 'trans_room.id')
            ->leftJoin('buildings as trans_building', 'trans_room.building_id', '=', 'trans_building.id')
            ->leftJoin('users', 'schedule_transfers.transferred_by_user_id', '=', 'users.id')
            ->select([
                'schedule_transfers.id',
                'schedule_transfers.transferred_at',
                'schedule_transfers.remarks',
                'subjects.name as subject_name',
                'subjects.code as subject_code',
                'room_schedules.section',
                'room_schedules.day_of_week',
                'room_schedules.start_time',
                'room_schedules.end_time',
                'departments.name as department_name',
                'departments.code as department_code',
                'branches.name as branch_name',
                'branches.code as branch_code',
                'prev_room.code as previous_room_code',
                'prev_room.type as previous_room_type',
                'prev_building.name as previous_building_name',
                'trans_room.code as transferred_room_code',
                'trans_room.type as transferred_room_type',
                'trans_building.name as transferred_building_name',
                'users.name as transferred_by_name',
            ]);

        if ($branchId = request()->input('filter_branch_id')) {
            $transfers->where('branches.id', $branchId);
        }

        if ($departmentId = request()->input('filter_department_id')) {
            $transfers->where('departments.id', $departmentId);
        }

        if ($dayOfWeek = request()->input('filter_day_of_week')) {
            $transfers->where('room_schedules.day_of_week', $dayOfWeek);
        }

        if ($roomId = request()->input('filter_room_id')) {
            $transfers->where(function ($q) use ($roomId) {
                $q->where('schedule_transfers.previous_room_id', $roomId)
                    ->orWhere('schedule_transfers.transferred_room_id', $roomId);
            });
        }

        if ($userId = request()->input('filter_user_id')) {
            $transfers->where('schedule_transfers.transferred_by_user_id', $userId);
        }

        return DataTables::of($transfers)
            ->filter(function ($query) {
                $search = request()->input('search.value');

                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('subjects.name', 'like', "%{$search}%")
                            ->orWhere('subjects.code', 'like', "%{$search}%")
                            ->orWhere('room_schedules.section', 'like', "%{$search}%")
                            ->orWhere('departments.name', 'like', "%{$search}%")
                            ->orWhere('departments.code', 'like', "%{$search}%")
                            ->orWhere('prev_room.code', 'like', "%{$search}%")
                            ->orWhere('trans_room.code', 'like', "%{$search}%")
                            ->orWhere('schedule_transfers.remarks', 'like', "%{$search}%")
                            ->orWhere('users.name', 'like', "%{$search}%");
                    });
                }
            })
            ->editColumn('transferred_at', function ($row) {
                return $row->transferred_at
                    ? \Carbon\Carbon::parse($row->transferred_at)->format('M d, Y h:i A')
                    : '-';
            })
            ->make(true);
    }
}
