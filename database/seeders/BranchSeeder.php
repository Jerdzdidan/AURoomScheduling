<?php

namespace Database\Seeders;

use App\Models\Branch;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    public function run(): void
    {
        $branches = [
            ['name' => 'Jasaan Campus',          'code' => 'JSC'],
            ['name' => 'Cagayan de Oro Campus',   'code' => 'CDO'],
            ['name' => 'Manila Campus',            'code' => 'MNL'],
        ];

        foreach ($branches as $branch) {
            Branch::firstOrCreate(['code' => $branch['code']], $branch);
        }
    }
}
