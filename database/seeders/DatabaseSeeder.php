<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Users
        User::factory()->create([
            'name' => 'root',
            'email' => 'root@gmail.com',
            'password' => '123456',
            'user_type' => 'ADMIN',
            'status' => true,
        ]);

        User::factory()->create([
            'name' => 'jerdan',
            'email' => 'jdonzdayao@gmail.com',
            'password' => '123456',
            'user_type' => 'ADMIN',
            'status' => true,
        ]);

        User::factory(30)->create();

        // Application data (order matters — respects FK dependencies)
        $this->call([
            BranchSeeder::class,
            DepartmentSeeder::class,
            ProgramSeeder::class,
            AcademicPeriodSeeder::class,
            BuildingSeeder::class,
            RoomSeeder::class,
            ProfessorSeeder::class,
            SubjectSeeder::class,
        ]);
    }
}
