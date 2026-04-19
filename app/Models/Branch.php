<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    //
    protected $fillable = [
        'name',
        'code',
    ];

    public function departments()
    {
        return $this->hasMany(Department::class);
    }

    public function buildings()
    {
        return $this->hasMany(Building::class);
    }
}
