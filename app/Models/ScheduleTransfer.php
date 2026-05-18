<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScheduleTransfer extends Model
{
    protected $fillable = [
        'room_schedule_id',
        'previous_room_id',
        'transferred_room_id',
        'remarks',
        'transferred_by_user_id',
        'transferred_at',
    ];

    protected $casts = [
        'transferred_at' => 'datetime',
    ];

    public function roomSchedule()
    {
        return $this->belongsTo(RoomSchedule::class);
    }

    public function previousRoom()
    {
        return $this->belongsTo(Room::class, 'previous_room_id');
    }

    public function transferredRoom()
    {
        return $this->belongsTo(Room::class, 'transferred_room_id');
    }

    public function transferredBy()
    {
        return $this->belongsTo(User::class, 'transferred_by_user_id');
    }
}
