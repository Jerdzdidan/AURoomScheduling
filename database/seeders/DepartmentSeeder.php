<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        // branch_code => departments
        $departments = [
            'JSC' => [
                ['name' => 'School of Computer Studies',       'code' => 'SCS'],
                ['name' => 'School of Engineering',            'code' => 'SOE'],
                ['name' => 'School of Business and Management','code' => 'SBM'],
            ],
            'CDO' => [
                ['name' => 'School of Computer Studies',       'code' => 'SCS'],
                ['name' => 'School of Education',              'code' => 'SED'],
            ],
            'MNL' => [
                ['name' => 'College of Computer Studies',      'code' => 'CCS'],
                ['name' => 'College of Engineering',           'code' => 'COE'],
            ],
        ];

        foreach ($departments as $branchCode => $depts) {
            $branch = Branch::where('code', $branchCode)->first();

            if (!$branch) {
                continue;
            }

            foreach ($depts as $dept) {
                Department::firstOrCreate(
                    ['code' => $dept['code'], 'branch_id' => $branch->id],
                    array_merge($dept, ['branch_id' => $branch->id])
                );
            }
        }
    }
}
