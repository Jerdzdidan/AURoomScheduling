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
        'department_id',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function roomSchedules()
    {
        return $this->hasMany(RoomSchedule::class);
    }
}
