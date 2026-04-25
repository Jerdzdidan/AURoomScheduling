<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Building;
use Illuminate\Database\Seeder;

class BuildingSeeder extends Seeder
{
    public function run(): void
    {
        // branch_code => buildings
        $buildings = [
            'JSC' => [
                ['name' => 'Main Building',     'code' => 'MB'],
                ['name' => 'Science Building',   'code' => 'SB'],
                ['name' => 'Engineering Building','code' => 'EB'],
            ],
            'CDO' => [
                ['name' => 'Administration Building', 'code' => 'AB'],
                ['name' => 'Academic Building',        'code' => 'ACAD'],
            ],
            'MNL' => [
                ['name' => 'Tower 1', 'code' => 'T1'],
                ['name' => 'Tower 2', 'code' => 'T2'],
            ],
        ];

        foreach ($buildings as $branchCode => $bldgs) {
            $branch = Branch::where('code', $branchCode)->first();

            if (!$branch) {
                continue;
            }

            foreach ($bldgs as $bldg) {
                Building::firstOrCreate(
                    ['code' => $bldg['code'], 'branch_id' => $branch->id],
                    array_merge($bldg, ['branch_id' => $branch->id])
                );
            }
        }
    }
}
