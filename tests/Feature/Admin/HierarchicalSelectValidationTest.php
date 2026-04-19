<?php

use App\Models\Branch;
use App\Models\Department;
use App\Models\Program;
use App\Models\User;

beforeEach(function () {
    $admin = User::factory()->create([
        'user_type' => 'ADMIN',
        'status' => true,
    ]);

    $this->actingAs($admin);
});

function createHierarchyForSelectValidation(): array
{
    $mainBranch = Branch::create([
        'name' => 'Arellano University - Main',
        'code' => 'MAIN',
    ]);

    $pasigBranch = Branch::create([
        'name' => 'Arellano University - Pasig',
        'code' => 'PASIG',
    ]);

    $mainDepartment = Department::create([
        'name' => 'College of Computer Studies',
        'code' => 'CCS',
        'branch_id' => $mainBranch->id,
    ]);

    $pasigDepartment = Department::create([
        'name' => 'College of Computer Studies',
        'code' => 'CCS',
        'branch_id' => $pasigBranch->id,
    ]);

    $mainProgram = Program::create([
        'name' => 'Bachelor of Science in Information Technology',
        'code' => 'BSIT',
        'description' => 'Main branch IT program',
        'department_id' => $mainDepartment->id,
    ]);

    $pasigProgram = Program::create([
        'name' => 'Bachelor of Science in Information Technology',
        'code' => 'BSIT',
        'description' => 'Pasig branch IT program',
        'department_id' => $pasigDepartment->id,
    ]);

    return compact(
        'mainBranch',
        'pasigBranch',
        'mainDepartment',
        'pasigDepartment',
        'mainProgram',
        'pasigProgram',
    );
}

test('program creation validates that the department belongs to the selected branch', function () {
    $data = createHierarchyForSelectValidation();

    $response = $this
        ->from(route('admin.utilities.programs.index'))
        ->post(route('admin.utilities.programs.store'), [
            'branch_id' => $data['mainBranch']->id,
            'department_id' => $data['pasigDepartment']->id,
            'name' => 'Bachelor of Science in Nursing',
            'code' => 'BSN',
            'description' => 'Mismatch test',
        ]);

    $response->assertRedirect(route('admin.utilities.programs.index'));
    $response->assertSessionHasErrors(['department_id']);
});

test('officer creation validates that the department belongs to the selected branch', function () {
    $data = createHierarchyForSelectValidation();

    $response = $this
        ->from(route('admin.users.officer-accounts.index'))
        ->post(route('admin.users.officer-accounts.store'), [
            'name' => 'Sample Officer',
            'email' => 'officer@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'branch_id' => $data['mainBranch']->id,
            'department_id' => $data['pasigDepartment']->id,
        ]);

    $response->assertRedirect(route('admin.users.officer-accounts.index'));
    $response->assertSessionHasErrors(['department_id']);
});

test('subject creation validates that the program belongs to the selected department and branch', function () {
    $data = createHierarchyForSelectValidation();

    $response = $this
        ->from(route('admin.core.subjects.index'))
        ->post(route('admin.core.subjects.store'), [
            'branch_id' => $data['mainBranch']->id,
            'department_id' => $data['mainDepartment']->id,
            'program_id' => $data['pasigProgram']->id,
            'name' => 'Introduction to Databases',
            'code' => 'ITDB101',
        ]);

    $response->assertRedirect(route('admin.core.subjects.index'));
    $response->assertSessionHasErrors(['program_id']);
});
