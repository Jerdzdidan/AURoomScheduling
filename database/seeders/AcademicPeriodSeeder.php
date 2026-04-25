<?php

namespace Database\Seeders;

use App\Models\AcademicPeriod;
use Illuminate\Database\Seeder;

class AcademicPeriodSeeder extends Seeder
{
    public function run(): void
    {
        $periods = [
            ['academic_year' => '2025-2026', 'year_start' => 2025, 'year_end' => 2026, 'semester' => '1ST',    'is_current' => false],
            ['academic_year' => '2025-2026', 'year_start' => 2025, 'year_end' => 2026, 'semester' => '2ND',    'is_current' => true],
            ['academic_year' => '2025-2026', 'year_start' => 2025, 'year_end' => 2026, 'semester' => 'SUMMER', 'is_current' => false],
            ['academic_year' => '2024-2025', 'year_start' => 2024, 'year_end' => 2025, 'semester' => '1ST',    'is_current' => false],
            ['academic_year' => '2024-2025', 'year_start' => 2024, 'year_end' => 2025, 'semester' => '2ND',    'is_current' => false],
        ];

        foreach ($periods as $period) {
            $period['name'] = "{$period['semester']} Semester, A.Y. {$period['academic_year']}";

            AcademicPeriod::firstOrCreate(
                [
                    'academic_year' => $period['academic_year'],
                    'semester'      => $period['semester'],
                ],
                $period
            );
        }
    }
}
