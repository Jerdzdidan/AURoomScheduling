<?php

namespace App\Http\Controllers\Admin\Reports;

use App\Http\Controllers\Controller;
use App\Models\ScheduleReassignment;
use Illuminate\Http\Request;
use Yajra\DataTables\DataTables;

class ScheduleReassignmentController extends Controller
{
    public function index()
    {
        return inertia('Admin/Reports/ScheduleReassignment');
    }

    public function getData(Request $request)
    {
        $reassignments = ScheduleReassignment::query()
            ->join('room_schedules', 'schedule_reassignments.room_schedule_id', '=', 'room_schedules.id')
            ->join('subjects', 'room_schedules.subject_id', '=', 'subjects.id')
            ->join('rooms as previous_rooms', 'schedule_reassignments.previous_room_id', '=', 'previous_rooms.id')
            ->join('rooms as new_rooms', 'schedule_reassignments.new_room_id', '=', 'new_rooms.id')
            ->leftJoin('users as creators', 'schedule_reassignments.created_by_user_id', '=', 'creators.id')
            ->select([
                'schedule_reassignments.id',
                'schedule_reassignments.remarks',
                'schedule_reassignments.created_at',
                'room_schedules.section',
                'room_schedules.day_of_week',
                'room_schedules.start_time',
                'room_schedules.end_time',
                'subjects.code as subject_code',
                'subjects.name as subject_name',
                'previous_rooms.code as previous_room_code',
                'new_rooms.code as new_room_code',
                'creators.name as creator_name',
                'creators.user_type as creator_user_type',
            ]);

        return DataTables::of($reassignments)
            ->filter(function ($query) use ($request) {
                $search = $request->input('search.value');
                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('subjects.code', 'like', "%{$search}%")
                            ->orWhere('subjects.name', 'like', "%{$search}%")
                            ->orWhere('room_schedules.section', 'like', "%{$search}%")
                            ->orWhere('previous_rooms.code', 'like', "%{$search}%")
                            ->orWhere('new_rooms.code', 'like', "%{$search}%")
                            ->orWhere('schedule_reassignments.remarks', 'like', "%{$search}%")
                            ->orWhere('creators.name', 'like', "%{$search}%");
                    });
                }
            })
            ->editColumn('created_at', function ($row) {
                return $row->created_at ? $row->created_at->format('M d, Y h:i A') : '';
            })
            ->addColumn('schedule_info', function ($row) {
                $startTime = \Carbon\Carbon::parse($row->start_time)->format('g:i A');
                $endTime = \Carbon\Carbon::parse($row->end_time)->format('g:i A');
                return "{$row->day_of_week} ({$startTime} - {$endTime})";
            })
            ->editColumn('creator_name', function ($row) {
                if (!$row->creator_name) return 'System';
                return $row->creator_name . ($row->creator_user_type === 'ADMIN' ? ' (Admin)' : ' (Officer)');
            })
            ->make(true);
    }
}
