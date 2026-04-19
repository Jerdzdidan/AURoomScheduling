<?php

use App\Models\AcademicPeriod;
use App\Models\Branch;
use App\Models\Building;
use App\Models\Department;
use App\Models\Professor;
use App\Models\Program;
use App\Models\Room;
use App\Models\RoomSchedule;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

function createScheduleAcademicPeriod(int $yearStart = 2025, string $semester = '1ST', bool $isCurrent = true): AcademicPeriod
{
    $yearEnd = $yearStart + 1;
    $academicYear = $yearStart . '-' . $yearEnd;

    return AcademicPeriod::create([
        'name' => 'A.Y. ' . $academicYear . ' - 1st Semester',
        'academic_year' => $academicYear,
        'year_start' => $yearStart,
        'year_end' => $yearEnd,
        'semester' => $semester,
        'is_current' => $isCurrent,
    ]);
}

function createScheduleDependencies(): array
{
    $branch = Branch::create([
        'name' => 'Jose Abad Santos Campus',
        'code' => 'JASC',
    ]);

    $department = Department::create([
        'name' => 'College of Computing Studies',
        'code' => 'CCS',
        'branch_id' => $branch->id,
    ]);

    $program = Program::create([
        'name' => 'Bachelor of Science in Information Technology',
        'code' => 'BSIT',
        'description' => 'Information Technology program',
        'department_id' => $department->id,
    ]);

    $subject = Subject::create([
        'name' => 'Programming Fundamentals',
        'code' => 'ITC 101',
        'program_id' => $program->id,
    ]);

    $building = Building::create([
        'name' => 'Academic Center',
        'code' => 'AC',
        'branch_id' => $branch->id,
    ]);

    $room = Room::create([
        'code' => 'AUJSC-AC-101',
        'type' => 'Lecture',
        'building_id' => $building->id,
    ]);

    $academicPeriod = createScheduleAcademicPeriod();

    return compact('branch', 'department', 'program', 'subject', 'building', 'room', 'academicPeriod');
}

function encryptedId(Model $model): string
{
    return Crypt::encryptString((string) $model->id);
}

beforeEach(function () {
    $admin = User::factory()->create([
        'user_type' => 'ADMIN',
        'status' => true,
    ]);

    $this->actingAs($admin);
});

test('admin can open the room schedule management page', function () {
    createScheduleDependencies();

    $response = $this->get(route('admin.core.room-schedules.index'));

    $response->assertOk();
});

test('room schedule show returns 400 for an invalid encrypted id', function () {
    $response = $this->get(route('admin.core.room-schedules.show', 'invalid-id'));

    $response
        ->assertStatus(400)
        ->assertJson([
            'message' => 'Invalid room schedule ID.',
        ]);
});

test('room schedule creation stores the schedule and professor', function () {
    $deps = createScheduleDependencies();

    $response = $this
        ->from(route('admin.core.room-schedules.index'))
        ->post(route('admin.core.room-schedules.store'), [
            'academic_period_id' => $deps['academicPeriod']->id,
            'branch_id' => $deps['branch']->id,
            'department_id' => $deps['department']->id,
            'program_id' => $deps['program']->id,
            'subject_id' => $deps['subject']->id,
            'room_id' => $deps['room']->id,
            'section' => 'BSIT-1A',
            'day_of_week' => 'MONDAY',
            'start_time' => '09:00',
            'end_time' => '10:30',
            'professor_name' => 'Prof. Maria Santos',
            'notes' => 'Morning block',
        ]);

    $response->assertRedirect(route('admin.core.room-schedules.index'));
    $response->assertSessionDoesntHaveErrors();

    $this->assertDatabaseHas('professors', [
        'name' => 'Prof. Maria Santos',
    ]);

    $professorId = Professor::query()->where('name', 'Prof. Maria Santos')->value('id');

    $this->assertDatabaseHas('room_schedules', [
        'academic_period_id' => $deps['academicPeriod']->id,
        'subject_id' => $deps['subject']->id,
        'room_id' => $deps['room']->id,
        'professor_id' => $professorId,
        'section' => 'BSIT-1A',
        'day_of_week' => 'MONDAY',
        'notes' => 'Morning block',
    ]);

    $createdSchedule = RoomSchedule::query()->firstOrFail();

    expect((string) $createdSchedule->start_time)->toStartWith('09:00');
    expect((string) $createdSchedule->end_time)->toStartWith('10:30');
});

test('room schedule creation blocks overlapping bookings for the same room', function () {
    $deps = createScheduleDependencies();
    $professor = Professor::create(['name' => 'Prof. Elena Cruz']);

    RoomSchedule::create([
        'academic_period_id' => $deps['academicPeriod']->id,
        'subject_id' => $deps['subject']->id,
        'room_id' => $deps['room']->id,
        'professor_id' => $professor->id,
        'section' => 'BSIT-1A',
        'day_of_week' => 'MONDAY',
        'start_time' => '09:00',
        'end_time' => '10:30',
        'notes' => null,
    ]);

    $response = $this
        ->from(route('admin.core.room-schedules.index'))
        ->post(route('admin.core.room-schedules.store'), [
            'academic_period_id' => $deps['academicPeriod']->id,
            'branch_id' => $deps['branch']->id,
            'department_id' => $deps['department']->id,
            'program_id' => $deps['program']->id,
            'subject_id' => $deps['subject']->id,
            'room_id' => $deps['room']->id,
            'section' => 'BSIT-1B',
            'day_of_week' => 'MONDAY',
            'start_time' => '10:00',
            'end_time' => '11:00',
            'professor_name' => 'Prof. Ana Reyes',
            'notes' => '',
        ]);

    $response->assertRedirect(route('admin.core.room-schedules.index'));
    $response->assertSessionHasErrors(['room_id']);

    expect(RoomSchedule::count())->toBe(1);
});

test('room schedule update ignores the current record during overlap checks', function () {
    $deps = createScheduleDependencies();
    $originalProfessor = Professor::create(['name' => 'Prof. Elena Cruz']);

    $schedule = RoomSchedule::create([
        'academic_period_id' => $deps['academicPeriod']->id,
        'subject_id' => $deps['subject']->id,
        'room_id' => $deps['room']->id,
        'professor_id' => $originalProfessor->id,
        'section' => 'BSIT-1A',
        'day_of_week' => 'MONDAY',
        'start_time' => '09:00',
        'end_time' => '10:30',
        'notes' => null,
    ]);

    $response = $this
        ->from(route('admin.core.room-schedules.index'))
        ->put(route('admin.core.room-schedules.update', encryptedId($schedule)), [
            'academic_period_id' => $deps['academicPeriod']->id,
            'branch_id' => $deps['branch']->id,
            'department_id' => $deps['department']->id,
            'program_id' => $deps['program']->id,
            'subject_id' => $deps['subject']->id,
            'room_id' => $deps['room']->id,
            'section' => 'BSIT-1A',
            'day_of_week' => 'MONDAY',
            'start_time' => '09:00',
            'end_time' => '10:30',
            'professor_name' => 'Prof. Ana Reyes',
            'notes' => 'Updated notes',
        ]);

    $response->assertRedirect(route('admin.core.room-schedules.index'));
    $response->assertSessionDoesntHaveErrors();

    $this->assertDatabaseHas('professors', [
        'name' => 'Prof. Ana Reyes',
    ]);

    $updatedProfessorId = Professor::query()->where('name', 'Prof. Ana Reyes')->value('id');

    $this->assertDatabaseHas('room_schedules', [
        'id' => $schedule->id,
        'professor_id' => $updatedProfessorId,
        'notes' => 'Updated notes',
    ]);
});

test('room schedule creation validates that the subject belongs to the selected program hierarchy', function () {
    $main = createScheduleDependencies();

    $secondBranch = Branch::create([
        'name' => 'Pasig Campus',
        'code' => 'PASIG',
    ]);

    $secondDepartment = Department::create([
        'name' => 'College of Computing Studies',
        'code' => 'CCS',
        'branch_id' => $secondBranch->id,
    ]);

    $secondProgram = Program::create([
        'name' => 'Bachelor of Science in Information Technology',
        'code' => 'BSIT',
        'description' => 'Pasig IT program',
        'department_id' => $secondDepartment->id,
    ]);

    $secondSubject = Subject::create([
        'name' => 'Programming Fundamentals',
        'code' => 'ITC 101',
        'program_id' => $secondProgram->id,
    ]);

    $response = $this
        ->from(route('admin.core.room-schedules.index'))
        ->post(route('admin.core.room-schedules.store'), [
            'academic_period_id' => $main['academicPeriod']->id,
            'branch_id' => $main['branch']->id,
            'department_id' => $main['department']->id,
            'program_id' => $main['program']->id,
            'subject_id' => $secondSubject->id,
            'room_id' => $main['room']->id,
            'section' => 'BSIT-1A',
            'day_of_week' => 'MONDAY',
            'start_time' => '09:00',
            'end_time' => '10:30',
            'professor_name' => 'Prof. Maria Santos',
            'notes' => '',
        ]);

    $response->assertRedirect(route('admin.core.room-schedules.index'));
    $response->assertSessionHasErrors(['subject_id']);
});
