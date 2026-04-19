<?php

use App\Models\Branch;
use App\Models\Building;
use App\Models\Room;
use App\Models\User;

beforeEach(function () {
    $admin = User::factory()->create([
        'user_type' => 'ADMIN',
        'status' => true,
    ]);

    $this->actingAs($admin);
});

test('room creation validates that the building belongs to the selected branch', function () {
    $mainBranch = Branch::create([
        'name' => 'Arellano University - Main',
        'code' => 'MAIN',
    ]);

    $pasigBranch = Branch::create([
        'name' => 'Arellano University - Pasig',
        'code' => 'PASIG',
    ]);

    $pasigBuilding = Building::create([
        'name' => 'Science Building',
        'code' => 'SB',
        'branch_id' => $pasigBranch->id,
    ]);

    $response = $this
        ->from(route('admin.core.rooms.index'))
        ->post(route('admin.core.rooms.store'), [
            'branch_id' => $mainBranch->id,
            'building_id' => $pasigBuilding->id,
            'code' => 'AUJSC-SB-101',
            'type' => 'Lecture',
        ]);

    $response->assertRedirect(route('admin.core.rooms.index'));
    $response->assertSessionHasErrors(['building_id']);

    expect(Room::count())->toBe(0);
});
