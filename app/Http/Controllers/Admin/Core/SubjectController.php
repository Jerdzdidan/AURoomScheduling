<?php

namespace App\Http\Controllers\Admin\Core;

use App\Http\Controllers\Controller;
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
            'programs' => Program::query()
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
        ]);
    }

    public function getData()
    {
        $subjects = Subject::query()
            ->leftJoin('programs', 'subjects.program_id', '=', 'programs.id')
            ->select([
                'subjects.id',
                'subjects.name',
                'subjects.code',
                'subjects.program_id',
                'programs.name as program_name',
                'programs.code as program_code',
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
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'required',
                'string',
                'max:255',
                Rule::unique('subjects', 'code')
                    ->ignore($subject?->id),
            ],
            'program_id' => ['required', 'integer', 'exists:programs,id'],
        ]);
    }

    private function findSubjectOrFail(string $id): Subject
    {
        $decrypted = Crypt::decryptString($id);

        return Subject::findOrFail($decrypted);
    }
}
