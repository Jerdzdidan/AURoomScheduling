<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    protected $fillable = [
        'name',
        'code',
        'subject_type',
        'class_type',
        'program_id',
    ];

    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    public function roomSchedules()
    {
        return $this->hasMany(RoomSchedule::class);
    }
}
