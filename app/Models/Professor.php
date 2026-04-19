<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Professor extends Model
{
    protected $fillable = [
        'name',
    ];

    public function roomSchedules()
    {
        return $this->hasMany(RoomSchedule::class);
    }
}
