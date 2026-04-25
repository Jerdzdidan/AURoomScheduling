<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Program;
use App\Models\Subject;
use Illuminate\Database\Seeder;

class SubjectSeeder extends Seeder
{
    public function run(): void
    {
        // branch_code => department_code => program_code => subjects
        $subjects = [
            'JSC' => [
                'SCS' => [
                    'BSCS' => [
                        ['code' => 'CS 111', 'name' => 'Introduction to Computing',           'subject_type' => 'MAJOR', 'class_type' => 'LEC'],
                        ['code' => 'CS 111', 'name' => 'Introduction to Computing',           'subject_type' => 'MAJOR', 'class_type' => 'LAB'],
                        ['code' => 'CS 112', 'name' => 'Data Structures and Algorithms',      'subject_type' => 'MAJOR', 'class_type' => 'LEC'],
                        ['code' => 'CS 113', 'name' => 'Object-Oriented Programming',         'subject_type' => 'MAJOR', 'class_type' => 'LEC'],
                        ['code' => 'CS 113', 'name' => 'Object-Oriented Programming',         'subject_type' => 'MAJOR', 'class_type' => 'LAB'],
                        ['code' => 'GE 101', 'name' => 'Mathematics in the Modern World',     'subject_type' => 'MINOR', 'class_type' => 'LEC'],
                    ],
                    'BSIT' => [
                        ['code' => 'IT 111', 'name' => 'Fundamentals of Information Technology','subject_type' => 'MAJOR', 'class_type' => 'LEC'],
                        ['code' => 'IT 112', 'name' => 'Web Development',                      'subject_type' => 'MAJOR', 'class_type' => 'LEC'],
                        ['code' => 'IT 112', 'name' => 'Web Development',                      'subject_type' => 'MAJOR', 'class_type' => 'LAB'],
                        ['code' => 'GE 101', 'name' => 'Mathematics in the Modern World',      'subject_type' => 'MINOR', 'class_type' => 'LEC'],
                    ],
                ],
                'SOE' => [
                    'BSCE' => [
                        ['code' => 'CE 111', 'name' => 'Engineering Drawing',       'subject_type' => 'MAJOR', 'class_type' => 'LEC'],
                        ['code' => 'CE 112', 'name' => 'Statics of Rigid Bodies',   'subject_type' => 'MAJOR', 'class_type' => 'LEC'],
                    ],
                ],
            ],
            'CDO' => [
                'SCS' => [
                    'BSIT' => [
                        ['code' => 'IT 111', 'name' => 'Fundamentals of Information Technology', 'subject_type' => 'MAJOR', 'class_type' => 'LEC'],
                        ['code' => 'IT 113', 'name' => 'Platform Technologies',                  'subject_type' => 'MAJOR', 'class_type' => 'LAB'],
                    ],
                ],
            ],
        ];

        foreach ($subjects as $branchCode => $departments) {
            $branch = Branch::where('code', $branchCode)->first();

            if (!$branch) {
                continue;
            }

            foreach ($departments as $deptCode => $programs) {
                $department = Department::where('code', $deptCode)
                    ->where('branch_id', $branch->id)
                    ->first();

                if (!$department) {
                    continue;
                }

                foreach ($programs as $progCode => $subs) {
                    $program = Program::where('code', $progCode)
                        ->where('department_id', $department->id)
                        ->first();

                    if (!$program) {
                        continue;
                    }

                    foreach ($subs as $sub) {
                        Subject::firstOrCreate(
                            [
                                'code'       => $sub['code'],
                                'class_type' => $sub['class_type'],
                                'program_id' => $program->id,
                            ],
                            array_merge($sub, ['program_id' => $program->id])
                        );
                    }
                }
            }
        }
    }
}
