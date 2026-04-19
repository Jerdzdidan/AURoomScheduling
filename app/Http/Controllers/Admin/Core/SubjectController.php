<?php

namespace App\Http\Controllers\Admin\Core;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Program;
use App\Models\Subject;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rule;
use Yajra\DataTables\DataTables;

class SubjectController extends Controller
{
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
                'subjects.program_id',
                'programs.name as program_name',
                'programs.code as program_code',
                'departments.name as department_name',
                'departments.code as department_code',
                'branches.name as branch_name',
                'branches.code as branch_code',
            ]);

        return DataTables::of($subjects)
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
                    ->ignore($subject?->id),
            ],
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
}
