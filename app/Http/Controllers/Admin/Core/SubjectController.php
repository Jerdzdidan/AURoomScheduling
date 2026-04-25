<?php

namespace App\Http\Controllers\Admin\Core;

use App\Http\Controllers\Controller;
use App\Imports\SubjectImport;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Program;
use App\Models\Subject;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rule;
use Maatwebsite\Excel\Facades\Excel;
use Yajra\DataTables\DataTables;

class SubjectController extends Controller
{
    private const SUBJECT_TYPES = ['MAJOR', 'MINOR'];
    private const CLASS_TYPES = ['LEC', 'LAB'];

    public function index()
    {
        return inertia('Admin/Core/Subject', [
            'branches' => Branch::query()
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
            'departments' => Department::query()
                ->join('branches', 'departments.branch_id', '=', 'branches.id')
                ->orderBy('branches.name')
                ->orderBy('departments.name')
                ->get([
                    'departments.id',
                    'departments.name',
                    'departments.code',
                    'departments.branch_id',
                    'branches.name as branch_name',
                    'branches.code as branch_code',
                ]),
            'programs' => Program::query()
                ->join('departments', 'programs.department_id', '=', 'departments.id')
                ->join('branches', 'departments.branch_id', '=', 'branches.id')
                ->orderBy('branches.name')
                ->orderBy('departments.name')
                ->orderBy('programs.name')
                ->get([
                    'programs.id',
                    'programs.name',
                    'programs.code',
                    'programs.department_id',
                    'departments.name as department_name',
                    'departments.code as department_code',
                    'departments.branch_id',
                    'branches.name as branch_name',
                    'branches.code as branch_code',
                ]),
            'subjectTypeOptions' => collect(self::SUBJECT_TYPES)
                ->map(fn(string $value) => ['id' => $value, 'name' => ucfirst(strtolower($value))])
                ->values(),
            'classTypeOptions' => collect(self::CLASS_TYPES)
                ->map(fn(string $value) => ['id' => $value, 'name' => $value])
                ->values(),
        ]);
    }

    public function getData()
    {
        $subjects = Subject::query()
            ->leftJoin('programs', 'subjects.program_id', '=', 'programs.id')
            ->leftJoin('departments', 'programs.department_id', '=', 'departments.id')
            ->leftJoin('branches', 'departments.branch_id', '=', 'branches.id')
            ->select([
                'subjects.id',
                'subjects.name',
                'subjects.code',
                'subjects.subject_type',
                'subjects.class_type',
                'subjects.program_id',
                'programs.name as program_name',
                'programs.code as program_code',
                'departments.name as department_name',
                'departments.code as department_code',
                'branches.name as branch_name',
                'branches.code as branch_code',
            ]);

        // Apply dropdown filters
        if ($branchId = request()->input('filter_branch_id')) {
            $subjects->where('branches.id', $branchId);
        }

        if ($departmentId = request()->input('filter_department_id')) {
            $subjects->where('departments.id', $departmentId);
        }

        if ($programId = request()->input('filter_program_id')) {
            $subjects->where('subjects.program_id', $programId);
        }

        if ($subjectType = request()->input('filter_subject_type')) {
            $subjects->where('subjects.subject_type', $subjectType);
        }

        if ($classType = request()->input('filter_class_type')) {
            $subjects->where('subjects.class_type', $classType);
        }

        return DataTables::of($subjects)
            ->filter(function ($query) {
                $search = request()->input('search.value');

                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('subjects.name', 'like', "%{$search}%")
                            ->orWhere('subjects.code', 'like', "%{$search}%")
                            ->orWhere('subjects.subject_type', 'like', "%{$search}%")
                            ->orWhere('subjects.class_type', 'like', "%{$search}%")
                            ->orWhere('programs.name', 'like', "%{$search}%")
                            ->orWhere('programs.code', 'like', "%{$search}%")
                            ->orWhere('departments.name', 'like', "%{$search}%")
                            ->orWhere('departments.code', 'like', "%{$search}%")
                            ->orWhere('branches.name', 'like', "%{$search}%")
                            ->orWhere('branches.code', 'like', "%{$search}%");
                    });
                }
            })
            ->editColumn('id', function ($row) {
                return Crypt::encryptString($row->id);
            })
            ->make(true);
    }

    public function getStats()
    {
        return response()->json([
            'total' => Subject::count(),
            'programs_covered' => Subject::query()->distinct('program_id')->count('program_id'),
        ]);
    }

    public function show($id)
    {
        try {
            $subject = $this->findSubjectOrFail($id);

            return response()->json([
                'id' => $id,
                'name' => $subject->name,
                'code' => $subject->code,
                'subject_type' => $subject->subject_type,
                'class_type' => $subject->class_type,
                'program_id' => $subject->program_id,
            ]);
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid subject ID.'], 400);
        }
    }

    public function store(Request $request)
    {
        Subject::create($this->validateSubject($request));

        return redirect()->back()->with('success', 'Subject created successfully.');
    }

    public function update(Request $request, $id)
    {
        try {
            $subject = $this->findSubjectOrFail($id);
            $subject->update($this->validateSubject($request, $subject));

            return redirect()->back()->with('success', 'Subject updated successfully.');
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid subject ID.'], 400);
        }
    }

    public function destroy($id)
    {
        try {
            $subject = $this->findSubjectOrFail($id);

            $subject->delete();

            return response()->json([
                'success' => true,
                'message' => 'Subject deleted successfully.',
            ]);
        } catch (DecryptException) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid subject ID.',
            ], 400);
        }
    }

    private function validateSubject(Request $request, ?Subject $subject = null): array
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
            'code' => strtoupper(trim((string) $request->input('code'))),
        ]);

        return $request->validate([
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'department_id' => [
                'required',
                'integer',
                Rule::exists('departments', 'id')
                    ->where(fn ($query) => $query->where('branch_id', $request->input('branch_id'))),
            ],
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'required',
                'string',
                'max:255',
                Rule::unique('subjects', 'code')
                    ->where('program_id', $request->input('program_id'))
                    ->where('class_type', $request->input('class_type'))
                    ->ignore($subject?->id),
            ],
            'subject_type' => ['required', 'string', Rule::in(self::SUBJECT_TYPES)],
            'class_type' => ['required', 'string', Rule::in(self::CLASS_TYPES)],
            'program_id' => [
                'required',
                'integer',
                Rule::exists('programs', 'id')
                    ->where(fn ($query) => $query->where('department_id', $request->input('department_id'))),
            ],
        ]);
    }

    private function findSubjectOrFail(string $id): Subject
    {
        $decrypted = Crypt::decryptString($id);

        return Subject::findOrFail($decrypted);
    }

    public function downloadImportTemplate()
    {
        $headers = ['code', 'name', 'branch_code', 'department_code', 'program_code', 'subject_type', 'class_type'];
        $examples = [
            ['ITC 110', 'Introduction to Computing', 'MNL', 'CCS', 'BSIT', 'MAJOR', 'LEC'],
            ['ITC 110', 'Introduction to Computing', 'MNL', 'CCS', 'BSIT', 'MAJOR', 'LAB'],
        ];

        $callback = function () use ($headers, $examples) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $headers);

            foreach ($examples as $row) {
                fputcsv($file, $row);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="subjects_import_template.csv"',
        ]);
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,xlsx,xls,txt', 'max:2048'],
        ]);

        $import = new SubjectImport();

        Excel::import($import, $request->file('file'));

        return response()->json([
            'imported' => $import->getImportedCount(),
            'skipped'  => $import->getSkippedCount(),
            'errors'   => $import->getErrors(),
        ]);
    }
}
