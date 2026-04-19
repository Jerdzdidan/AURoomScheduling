<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class AcademicPeriod extends Model
{
    protected $fillable = [
        'name',
        'academic_year',
        'year_start',
        'year_end',
        'semester',
        'is_current',
    ];

    public function scopeLatestFirst(Builder $query): Builder
    {
        return $query
            ->orderByDesc('year_end')
            ->orderByRaw("
                CASE semester
                    WHEN 'SUMMER' THEN 3
                    WHEN '2ND' THEN 2
                    WHEN '1ST' THEN 1
                    ELSE 0
                END DESC
            ");
    }
}
