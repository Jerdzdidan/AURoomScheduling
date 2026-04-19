<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    protected $fillable = [
        'name',
        'code',
        'program_id',
    ];

    public function program()
    {
        return $this->belongsTo(Program::class);
    }
}
