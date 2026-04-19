<?php

use App\Models\Branch;
use App\Models\Department;
use App\Models\Program;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;

function createDepartmentBranch(string $name = 'Arellano University - Main', string $code = 'MAIN'): Branch
{
    return Branch::create([
        'name' => $name,
        'code' => $code,
    ]);
}

function createDepartmentRecord(
    Branch $branch,
    string $name = 'College of Engineering',
    string $code = 'ENG'
): Department {
    return Department::create([
        'name' => $name,
        'code' => $code,
        'branch_id' => $branch->id,
    ]);
}

beforeEach(function () {
    $admin = User::factory()->create([
        'user_type' => 'ADMIN',
        'status' => true,
    ]);

    $this->actingAs($admin);
});

test('admin can open the department management page', function () {
    $branch = createDepartmentBranch();

    $response = $this->get(route('admin.utilities.departments.index'));

    $response->assertOk();
    $response->assertSee($branch->name);
});

test('department show returns 400 for an invalid encrypted id', function () {
    $response = $this->get(route('admin.utilities.departments.show', 'invalid-id'));

    $response
        ->assertStatus(400)
        ->assertJson([
            'message' => 'Invalid department ID.',
        ]);
});

test('department creation validates required fields', function () {
    $response = $this
        ->from(route('admin.utilities.departments.index'))
        ->post(route('admin.utilities.departments.store'), [
            'name' => '',
            'code' => '',
            'branch_id' => '',
        ]);

    $response->assertRedirect(route('admin.utilities.departments.index'));
    $response->assertSessionHasErrors(['name', 'code', 'branch_id']);
});

test('department creation validates branch exists', function () {
    $response = $this
        ->from(route('admin.utilities.departments.index'))
        ->post(route('admin.utilities.departments.store'), [
            'name' => 'College of Engineering',
            'code' => 'ENG',
            'branch_id' => 999999,
        ]);

    $response->assertRedirect(route('admin.utilities.departments.index'));
    $response->assertSessionHasErrors(['branch_id']);
});

test('department creation validates unique name and code within the same branch', function () {
    $branch = createDepartmentBranch();
    createDepartmentRecord($branch);

    $response = $this
        ->from(route('admin.utilities.departments.index'))
        ->post(route('admin.utilities.departments.store'), [
            'name' => 'College of Engineering',
            'code' => 'ENG',
            'branch_id' => $branch->id,
        ]);

    $response->assertRedirect(route('admin.utilities.departments.index'));
    $response->assertSessionHasErrors(['name', 'code']);
});

test('department creation allows the same name and code in a different branch', function () {
    $firstBranch = createDepartmentBranch('Arellano University - Main', 'MAIN');
    $secondBranch = createDepartmentBranch('Arellano University - Pasig', 'PASIG');
    createDepartmentRecord($firstBranch);

    $response = $this
        ->from(route('admin.utilities.departments.index'))
        ->post(route('admin.utilities.departments.store'), [
            'name' => 'College of Engineering',
            'code' => 'eng',
            'branch_id' => $secondBranch->id,
        ]);

    $response->assertRedirect(route('admin.utilities.departments.index'));
    $response->assertSessionDoesntHaveErrors();

    $this->assertDatabaseHas('departments', [
        'branch_id' => $secondBranch->id,
        'name' => 'College of Engineering',
        'code' => 'ENG',
    ]);
});

test('department update ignores the current records own unique values', function () {
    $branch = createDepartmentBranch();
    $department = createDepartmentRecord($branch);

    $response = $this
        ->from(route('admin.utilities.departments.index'))
        ->put(route('admin.utilities.departments.update', Crypt::encryptString((string) $department->id)), [
            'name' => 'College of Engineering',
            'code' => 'eng',
            'branch_id' => $branch->id,
        ]);

    $response->assertRedirect(route('admin.utilities.departments.index'));
    $response->assertSessionDoesntHaveErrors();

    $this->assertDatabaseHas('departments', [
        'id' => $department->id,
        'name' => 'College of Engineering',
        'code' => 'ENG',
        'branch_id' => $branch->id,
    ]);
});

test('department delete is blocked when programs still exist', function () {
    $branch = createDepartmentBranch();
    $department = createDepartmentRecord($branch);

    Program::create([
        'name' => 'BS Computer Engineering',
        'code' => 'BSCPE',
        'description' => 'Engineering program',
        'department_id' => $department->id,
    ]);

    $response = $this->delete(route('admin.utilities.departments.delete', Crypt::encryptString((string) $department->id)));

    $response
        ->assertStatus(422)
        ->assertJson([
            'success' => false,
            'message' => 'This department cannot be deleted while it still has programs.',
        ]);
});

test('department delete is blocked when users are assigned', function () {
    $branch = createDepartmentBranch();
    $department = createDepartmentRecord($branch);

    User::factory()->create([
        'department_id' => $department->id,
    ]);

    $response = $this->delete(route('admin.utilities.departments.delete', Crypt::encryptString((string) $department->id)));

    $response
        ->assertStatus(422)
        ->assertJson([
            'success' => false,
            'message' => 'This department cannot be deleted while it still has assigned users.',
        ]);
});

test('department can be deleted when no related programs or users exist', function () {
    $branch = createDepartmentBranch();
    $department = createDepartmentRecord($branch);

    $response = $this->delete(route('admin.utilities.departments.delete', Crypt::encryptString((string) $department->id)));

    $response->assertOk();

    $this->assertDatabaseMissing('departments', [
        'id' => $department->id,
    ]);
});

test('department stats report total and branches covered counts', function () {
    $firstBranch = createDepartmentBranch('Arellano University - Main', 'MAIN');
    $secondBranch = createDepartmentBranch('Arellano University - Pasig', 'PASIG');

    createDepartmentRecord($firstBranch, 'College of Engineering', 'ENG');
    createDepartmentRecord($secondBranch, 'College of Nursing', 'NURS');

    $this->getJson(route('admin.utilities.departments.stats'))
        ->assertOk()
        ->assertJson([
            'total' => 2,
            'branches_covered' => 2,
        ]);
});

test('department data includes branch and relation counts for datatables', function () {
    $branch = createDepartmentBranch();
    $department = createDepartmentRecord($branch);

    Program::create([
        'name' => 'BS Information Technology',
        'code' => 'BSIT',
        'description' => 'IT program',
        'department_id' => $department->id,
    ]);

    User::factory()->create([
        'department_id' => $department->id,
    ]);

    $response = $this->getJson(route('admin.utilities.departments.data', [
        'draw' => 1,
        'start' => 0,
        'length' => 10,
    ]));

    $response->assertOk();
    expect($response->json('data.0.branch_name'))->toBe($branch->name);
    expect($response->json('data.0.branch_code'))->toBe($branch->code);
    expect($response->json('data.0.programs_count'))->toBe(1);
    expect($response->json('data.0.users_count'))->toBe(1);
});
