<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    protected $fillable = [
        'name',
        'code',
        'branch_id',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function subjects()
    {
        return $this->hasMany(Subject::class);
    }

    public function rooms()
    {
        return $this->belongsToMany(Room::class);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
