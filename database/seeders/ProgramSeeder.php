<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Program;
use Illuminate\Database\Seeder;

class ProgramSeeder extends Seeder
{
    public function run(): void
    {
        // branch_code => department_code => programs
        $programs = [
            'JSC' => [
                'SCS' => [
                    ['name' => 'Bachelor of Science in Computer Science',         'code' => 'BSCS'],
                    ['name' => 'Bachelor of Science in Information Technology',   'code' => 'BSIT'],
                ],
                'SOE' => [
                    ['name' => 'Bachelor of Science in Civil Engineering',        'code' => 'BSCE'],
                    ['name' => 'Bachelor of Science in Electrical Engineering',   'code' => 'BSEE'],
                ],
                'SBM' => [
                    ['name' => 'Bachelor of Science in Business Administration',  'code' => 'BSBA'],
                    ['name' => 'Bachelor of Science in Accountancy',             'code' => 'BSA'],
                ],
            ],
            'CDO' => [
                'SCS' => [
                    ['name' => 'Bachelor of Science in Information Technology',   'code' => 'BSIT'],
                    ['name' => 'Bachelor of Science in Computer Science',         'code' => 'BSCS'],
                ],
                'SED' => [
                    ['name' => 'Bachelor of Secondary Education',                'code' => 'BSED'],
                ],
            ],
            'MNL' => [
                'CCS' => [
                    ['name' => 'Bachelor of Science in Information Technology',   'code' => 'BSIT'],
                ],
                'COE' => [
                    ['name' => 'Bachelor of Science in Computer Engineering',     'code' => 'BSCpE'],
                ],
            ],
        ];

        foreach ($programs as $branchCode => $departments) {
            $branch = Branch::where('code', $branchCode)->first();

            if (!$branch) {
                continue;
            }

            foreach ($departments as $deptCode => $progs) {
                $department = Department::where('code', $deptCode)
                    ->where('branch_id', $branch->id)
                    ->first();

                if (!$department) {
                    continue;
                }

                foreach ($progs as $prog) {
                    Program::firstOrCreate(
                        ['code' => $prog['code'], 'department_id' => $department->id],
                        array_merge($prog, ['department_id' => $department->id])
                    );
                }
            }
        }
    }
}
