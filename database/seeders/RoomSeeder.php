<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Building;
use App\Models\Department;
use App\Models\Room;
use Illuminate\Database\Seeder;

class RoomSeeder extends Seeder
{
    public function run(): void
    {
        // branch_code => building_code => rooms
        $rooms = [
            'JSC' => [
                'MB' => [
                    ['code' => 'MB-101', 'type' => 'Lecture'],
                    ['code' => 'MB-102', 'type' => 'Lecture'],
                    ['code' => 'MB-201', 'type' => 'Laboratory'],
                    ['code' => 'MB-202', 'type' => 'Laboratory'],
                ],
                'SB' => [
                    ['code' => 'SB-101', 'type' => 'Laboratory'],
                    ['code' => 'SB-102', 'type' => 'Lecture'],
                ],
                'EB' => [
                    ['code' => 'EB-101', 'type' => 'Lecture'],
                    ['code' => 'EB-201', 'type' => 'Laboratory'],
                ],
            ],
            'CDO' => [
                'AB' => [
                    ['code' => 'AB-101', 'type' => 'Lecture'],
                    ['code' => 'AB-102', 'type' => 'Lecture'],
                ],
                'ACAD' => [
                    ['code' => 'ACAD-101', 'type' => 'Lecture'],
                    ['code' => 'ACAD-201', 'type' => 'Laboratory'],
                ],
            ],
            'MNL' => [
                'T1' => [
                    ['code' => 'T1-501', 'type' => 'Lecture'],
                    ['code' => 'T1-502', 'type' => 'Laboratory'],
                ],
                'T2' => [
                    ['code' => 'T2-301', 'type' => 'Lecture'],
                ],
            ],
        ];

        foreach ($rooms as $branchCode => $buildings) {
            $branch = Branch::where('code', $branchCode)->first();

            if (!$branch) {
                continue;
            }

            $departmentIds = Department::query()
                ->where('branch_id', $branch->id)
                ->pluck('id')
                ->all();

            foreach ($buildings as $buildingCode => $rms) {
                $building = Building::where('code', $buildingCode)
                    ->where('branch_id', $branch->id)
                    ->first();

                if (!$building) {
                    continue;
                }

                foreach ($rms as $room) {
                    $roomModel = Room::firstOrCreate(
                        ['code' => $room['code'], 'building_id' => $building->id],
                        array_merge($room, ['building_id' => $building->id])
                    );

                    if ($departmentIds) {
                        $roomModel->departments()->syncWithoutDetaching($departmentIds);
                    }
                }
            }
        }
    }
}
