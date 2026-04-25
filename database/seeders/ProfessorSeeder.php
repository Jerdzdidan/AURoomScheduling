<?php

namespace Database\Seeders;

use App\Models\Professor;
use Illuminate\Database\Seeder;

class ProfessorSeeder extends Seeder
{
    public function run(): void
    {
        $professors = [
            'Dr. Maria Santos',
            'Prof. Juan dela Cruz',
            'Dr. Ana Reyes',
            'Prof. Carlos Garcia',
            'Dr. Elena Villanueva',
            'Prof. Miguel Torres',
            'Dr. Rosa Aquino',
            'Prof. Ricardo Mendoza',
            'Dr. Patricia Lim',
            'Prof. Fernando Cruz',
        ];

        foreach ($professors as $name) {
            Professor::firstOrCreate(['name' => $name]);
        }
    }
}
