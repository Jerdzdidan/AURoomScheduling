<?php

use App\Models\AcademicPeriod;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;

const SEMESTER_NAMES = [
    '1ST' => '1st Semester',
    '2ND' => '2nd Semester',
    'SUMMER' => 'Summer',
];

function createAcademicPeriod(int $yearStart, string $semester, bool $isCurrent = false): AcademicPeriod
{
    $yearEnd = $yearStart + 1;
    $academicYear = $yearStart . '-' . $yearEnd;

    return AcademicPeriod::create([
        'name' => 'A.Y. ' . $academicYear . ' - ' . SEMESTER_NAMES[$semester],
        'academic_year' => $academicYear,
        'year_start' => $yearStart,
        'year_end' => $yearEnd,
        'semester' => $semester,
        'is_current' => $isCurrent,
    ]);
}

beforeEach(function () {
    $admin = User::factory()->create([
        'user_type' => 'ADMIN',
        'status' => true,
    ]);

    $this->actingAs($admin);
});

test('admin can open the academic period management page', function () {
    $response = $this->get(route('admin.utilities.academic-periods.index'));

    $response->assertOk();
});

test('academic period show returns 400 for an invalid encrypted id', function () {
    $response = $this->get(route('admin.utilities.academic-periods.show', 'invalid-id'));

    $response
        ->assertStatus(400)
        ->assertJson([
            'message' => 'Invalid academic period ID.',
        ]);
});

test('academic period creation validates 4 digit years', function () {
    $response = $this
        ->from(route('admin.utilities.academic-periods.index'))
        ->post(route('admin.utilities.academic-periods.store'), [
            'year_start' => 999,
            'year_end' => 10000,
            'semester' => '1ST',
        ]);

    $response->assertRedirect(route('admin.utilities.academic-periods.index'));
    $response->assertSessionHasErrors(['year_start', 'year_end']);
});

test('academic period creation validates consecutive years', function () {
    $response = $this
        ->from(route('admin.utilities.academic-periods.index'))
        ->post(route('admin.utilities.academic-periods.store'), [
            'year_start' => 2025,
            'year_end' => 2027,
            'semester' => '1ST',
        ]);

    $response->assertRedirect(route('admin.utilities.academic-periods.index'));
    $response->assertSessionHasErrors(['year_end']);
});

test('academic period creation validates semester values', function () {
    $response = $this
        ->from(route('admin.utilities.academic-periods.index'))
        ->post(route('admin.utilities.academic-periods.store'), [
            'year_start' => 2025,
            'year_end' => 2026,
            'semester' => '3RD',
        ]);

    $response->assertRedirect(route('admin.utilities.academic-periods.index'));
    $response->assertSessionHasErrors(['semester']);
});

test('academic period creation validates uniqueness of academic year and semester', function () {
    createAcademicPeriod(2025, '1ST', true);

    $response = $this
        ->from(route('admin.utilities.academic-periods.index'))
        ->post(route('admin.utilities.academic-periods.store'), [
            'year_start' => 2025,
            'year_end' => 2026,
            'semester' => '1ST',
        ]);

    $response->assertRedirect(route('admin.utilities.academic-periods.index'));
    $response->assertSessionHasErrors(['semester']);
});

test('academic period update ignores the current records own academic year and semester for uniqueness', function () {
    $academicPeriod = createAcademicPeriod(2025, '1ST', true);

    $response = $this
        ->from(route('admin.utilities.academic-periods.index'))
        ->put(route('admin.utilities.academic-periods.update', Crypt::encryptString((string) $academicPeriod->id)), [
            'year_start' => 2025,
            'year_end' => 2026,
            'semester' => '1ST',
        ]);

    $response->assertRedirect(route('admin.utilities.academic-periods.index'));
    $response->assertSessionDoesntHaveErrors();

    $this->assertDatabaseHas('academic_periods', [
        'id' => $academicPeriod->id,
        'academic_year' => '2025-2026',
        'semester' => '1ST',
        'is_current' => true,
    ]);
});

test('first academic period created becomes current automatically', function () {
    $this->post(route('admin.utilities.academic-periods.store'), [
        'year_start' => 2025,
        'year_end' => 2026,
        'semester' => '1ST',
    ]);

    $this->assertDatabaseHas('academic_periods', [
        'academic_year' => '2025-2026',
        'semester' => '1ST',
        'is_current' => true,
    ]);
});

test('setting current academic period leaves exactly one current record', function () {
    $first = createAcademicPeriod(2024, '1ST', true);
    $second = createAcademicPeriod(2025, '2ND');

    $response = $this->post(route('admin.utilities.academic-periods.set-current', Crypt::encryptString((string) $second->id)));

    $response->assertOk();

    expect(AcademicPeriod::where('is_current', true)->count())->toBe(1);

    $this->assertDatabaseHas('academic_periods', [
        'id' => $first->id,
        'is_current' => false,
    ]);

    $this->assertDatabaseHas('academic_periods', [
        'id' => $second->id,
        'is_current' => true,
    ]);
});

test('deleting a non current academic period keeps the current record unchanged', function () {
    $current = createAcademicPeriod(2024, '2ND', true);
    $nonCurrent = createAcademicPeriod(2025, '1ST');

    $response = $this->delete(route('admin.utilities.academic-periods.delete', Crypt::encryptString((string) $nonCurrent->id)));

    $response->assertOk();

    $this->assertDatabaseMissing('academic_periods', [
        'id' => $nonCurrent->id,
    ]);

    $this->assertDatabaseHas('academic_periods', [
        'id' => $current->id,
        'is_current' => true,
    ]);
});

test('deleting the current academic period promotes the latest remaining record', function () {
    $current = createAcademicPeriod(2024, '2ND', true);
    createAcademicPeriod(2025, '1ST');
    $latest = createAcademicPeriod(2025, 'SUMMER');

    $response = $this->delete(route('admin.utilities.academic-periods.delete', Crypt::encryptString((string) $current->id)));

    $response->assertOk();

    expect(AcademicPeriod::where('is_current', true)->count())->toBe(1);

    $this->assertDatabaseHas('academic_periods', [
        'id' => $latest->id,
        'is_current' => true,
    ]);
});

test('deleting the last academic period makes stats report none as current', function () {
    $academicPeriod = createAcademicPeriod(2025, '1ST', true);

    $this->delete(route('admin.utilities.academic-periods.delete', Crypt::encryptString((string) $academicPeriod->id)))
        ->assertOk();

    $this->getJson(route('admin.utilities.academic-periods.stats'))
        ->assertOk()
        ->assertJson([
            'total' => 0,
            'current' => 'None',
        ]);
});
