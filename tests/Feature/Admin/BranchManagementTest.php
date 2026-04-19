<?php

use App\Models\Branch;
use App\Models\Department;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;

function createBranch(string $name = 'Arellano University - Main', string $code = 'MAIN'): Branch
{
    return Branch::create([
        'name' => $name,
        'code' => $code,
    ]);
}

beforeEach(function () {
    $admin = User::factory()->create([
        'user_type' => 'ADMIN',
        'status' => true,
    ]);

    $this->actingAs($admin);
});

test('admin can open the branch management page', function () {
    $response = $this->get(route('admin.utilities.branches.index'));

    $response->assertOk();
});

test('branch show returns 400 for an invalid encrypted id', function () {
    $response = $this->get(route('admin.utilities.branches.show', 'invalid-id'));

    $response
        ->assertStatus(400)
        ->assertJson([
            'message' => 'Invalid branch ID.',
        ]);
});

test('branch creation validates required fields', function () {
    $response = $this
        ->from(route('admin.utilities.branches.index'))
        ->post(route('admin.utilities.branches.store'), [
            'name' => '',
            'code' => '',
        ]);

    $response->assertRedirect(route('admin.utilities.branches.index'));
    $response->assertSessionHasErrors(['name', 'code']);
});

test('branch creation validates unique name and code', function () {
    createBranch();

    $response = $this
        ->from(route('admin.utilities.branches.index'))
        ->post(route('admin.utilities.branches.store'), [
            'name' => 'Arellano University - Main',
            'code' => 'MAIN',
        ]);

    $response->assertRedirect(route('admin.utilities.branches.index'));
    $response->assertSessionHasErrors(['name', 'code']);
});

test('branch update ignores the current records own unique values', function () {
    $branch = createBranch();

    $response = $this
        ->from(route('admin.utilities.branches.index'))
        ->put(route('admin.utilities.branches.update', Crypt::encryptString((string) $branch->id)), [
            'name' => 'Arellano University - Main',
            'code' => 'main',
        ]);

    $response->assertRedirect(route('admin.utilities.branches.index'));
    $response->assertSessionDoesntHaveErrors();

    $this->assertDatabaseHas('branches', [
        'id' => $branch->id,
        'name' => 'Arellano University - Main',
        'code' => 'MAIN',
    ]);
});

test('branch delete is blocked when departments still exist', function () {
    $branch = createBranch();

    Department::create([
        'name' => 'College of Engineering',
        'code' => 'ENG',
        'branch_id' => $branch->id,
    ]);

    $response = $this->delete(route('admin.utilities.branches.delete', Crypt::encryptString((string) $branch->id)));

    $response
        ->assertStatus(422)
        ->assertJson([
            'success' => false,
            'message' => 'This branch cannot be deleted while it still has departments.',
        ]);

    $this->assertDatabaseHas('branches', [
        'id' => $branch->id,
    ]);
});

test('branch can be deleted when no departments are attached', function () {
    $branch = createBranch();

    $response = $this->delete(route('admin.utilities.branches.delete', Crypt::encryptString((string) $branch->id)));

    $response->assertOk();

    $this->assertDatabaseMissing('branches', [
        'id' => $branch->id,
    ]);
});

test('branch stats report total and in use counts', function () {
    $first = createBranch('Arellano University - Main', 'MAIN');
    createBranch('Arellano University - Pasig', 'PASIG');

    Department::create([
        'name' => 'College of Arts and Sciences',
        'code' => 'CAS',
        'branch_id' => $first->id,
    ]);

    $this->getJson(route('admin.utilities.branches.stats'))
        ->assertOk()
        ->assertJson([
            'total' => 2,
            'in_use' => 1,
        ]);
});

test('branch data includes departments count for datatables', function () {
    $branch = createBranch();

    Department::create([
        'name' => 'College of Engineering',
        'code' => 'ENG',
        'branch_id' => $branch->id,
    ]);

    $response = $this->getJson(route('admin.utilities.branches.data', [
        'draw' => 1,
        'start' => 0,
        'length' => 10,
    ]));

    $response->assertOk();
    expect($response->json('data.0.departments_count'))->toBe(1);
});
