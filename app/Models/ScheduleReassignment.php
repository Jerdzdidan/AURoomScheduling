<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScheduleReassignment extends Model
{
    protected $fillable = [
        'room_schedule_id',
        'previous_room_id',
        'new_room_id',
        'remarks',
        'created_by_user_id',
    ];

    public function roomSchedule()
    {
        return $this->belongsTo(RoomSchedule::class);
    }

    public function previousRoom()
    {
        return $this->belongsTo(Room::class, 'previous_room_id');
    }

    public function newRoom()
    {
        return $this->belongsTo(Room::class, 'new_room_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
