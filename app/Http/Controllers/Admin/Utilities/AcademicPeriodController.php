<?php

namespace App\Http\Controllers\Admin\Utilities;

use App\Http\Controllers\Controller;
use App\Models\AcademicPeriod;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Yajra\DataTables\DataTables;

class AcademicPeriodController extends Controller
{
    private const SEMESTER_LABELS = [
        '1ST' => '1st Semester',
        '2ND' => '2nd Semester',
        'SUMMER' => 'Summer',
    ];

    public function index()
    {
        return inertia('Admin/Utilities/AcademicPeriod');
    }

    public function getData()
    {
        $academic_periods = AcademicPeriod::select(['id', 'academic_year', 'semester', 'is_current']);

        return DataTables::of($academic_periods)
            ->editColumn('id', function ($row) {
                return Crypt::encryptString($row->id);
            })
            ->make(true);
    }

    public function getStats()
    {
        $current = AcademicPeriod::where('is_current', true)->first();

        return response()->json([
            'total' => AcademicPeriod::count(),
            'current' => $current ? $this->formatAcademicPeriodName($current->academic_year, $current->semester) : 'None',
        ]);
    }

    public function show($id)
    {
        try {
            $academicPeriod = $this->findAcademicPeriodOrFail($id);

            return response()->json([
                'id' => $id,
                'year_start' => $academicPeriod->year_start,
                'year_end' => $academicPeriod->year_end,
                'semester' => $academicPeriod->semester,
                'is_current' => $academicPeriod->is_current,
            ]);
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid academic period ID.'], 400);
        }
    }

    public function store(Request $request)
    {
        $payload = $this->validateAcademicPeriod($request);

        DB::transaction(function () use ($payload) {
            AcademicPeriod::create([
                ...$payload,
                'is_current' => !AcademicPeriod::where('is_current', true)->exists(),
            ]);
        });

        return redirect()->back()->with('success', 'Academic Period created successfully.');
    }

    public function update(Request $request, $id)
    {
        try {
            $academicPeriod = $this->findAcademicPeriodOrFail($id);
            $payload = $this->validateAcademicPeriod($request, $academicPeriod);

            $academicPeriod->update($payload);

            return redirect()->back()->with('success', 'Academic Period updated successfully.');
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid academic period ID.'], 400);
        }
    }

    public function setCurrent($id)
    {
        try {
            $academicPeriod = $this->findAcademicPeriodOrFail($id);

            DB::transaction(function () use ($academicPeriod) {
                AcademicPeriod::query()->update(['is_current' => false]);
                $academicPeriod->update(['is_current' => true]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Academic Period set as current successfully.',
            ]);
        } catch (DecryptException) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid academic period ID.',
            ], 400);
        }
    }

    public function destroy($id)
    {
        try {
            $academicPeriod = $this->findAcademicPeriodOrFail($id);
            $wasCurrent = (bool) $academicPeriod->is_current;

            DB::transaction(function () use ($academicPeriod, $wasCurrent) {
                $academicPeriod->delete();

                if ($wasCurrent) {
                    $this->promoteLatestAcademicPeriod();
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'Academic Period deleted successfully.',
            ]);
        } catch (DecryptException) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid academic period ID.',
            ], 400);
        }
    }

    private function validateAcademicPeriod(Request $request, ?AcademicPeriod $academicPeriod = null): array
    {
        $request->merge([
            'semester' => strtoupper((string) $request->input('semester')),
        ]);

        $validated = $request->validate([
            'year_start' => ['required', 'integer', 'digits:4'],
            'year_end' => ['required', 'integer', 'digits:4'],
            'semester' => ['required', 'string', Rule::in(array_keys(self::SEMESTER_LABELS))],
        ]);

        if ((int) $validated['year_end'] !== (int) $validated['year_start'] + 1) {
            throw ValidationException::withMessages([
                'year_end' => ['The end year must be exactly one year after the start year.'],
            ]);
        }

        $academicYear = $validated['year_start'] . '-' . $validated['year_end'];

        $alreadyExists = AcademicPeriod::query()
            ->where('academic_year', $academicYear)
            ->where('semester', $validated['semester'])
            ->when($academicPeriod, fn ($query) => $query->whereKeyNot($academicPeriod->id))
            ->exists();

        if ($alreadyExists) {
            throw ValidationException::withMessages([
                'semester' => ['The semester already exists for the specified school year.'],
            ]);
        }

        return [
            'name' => $this->formatAcademicPeriodName($academicYear, $validated['semester']),
            'academic_year' => $academicYear,
            'year_start' => (int) $validated['year_start'],
            'year_end' => (int) $validated['year_end'],
            'semester' => $validated['semester'],
        ];
    }

    private function formatAcademicPeriodName(string $academicYear, string $semester): string
    {
        return 'A.Y. ' . $academicYear . ' - ' . self::SEMESTER_LABELS[$semester];
    }

    private function findAcademicPeriodOrFail(string $id): AcademicPeriod
    {
        $decrypted = Crypt::decryptString($id);

        return AcademicPeriod::findOrFail($decrypted);
    }

    private function promoteLatestAcademicPeriod(): void
    {
        $latest = AcademicPeriod::query()->latestFirst()->first();

        if ($latest) {
            AcademicPeriod::query()->update(['is_current' => false]);
            $latest->update(['is_current' => true]);
        }
    }
}
