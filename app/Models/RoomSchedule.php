<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoomSchedule extends Model
{
    protected $fillable = [
        'academic_period_id',
        'subject_id',
        'room_id',
        'professor_id',
        'section',
        'day_of_week',
        'start_time',
        'end_time',
        'notes',
    ];

    public function academicPeriod()
    {
        return $this->belongsTo(AcademicPeriod::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function professor()
    {
        return $this->belongsTo(Professor::class);
    }
}
