<?php

namespace App\Http\Controllers\Admin\Utilities;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Program;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rule;
use Yajra\DataTables\DataTables;

class ProgramController extends Controller
{
    public function index()
    {
        return inertia('Admin/Utilities/Program', [
            'departments' => Department::query()
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
        ]);
    }

    public function getData()
    {
        $programs = Program::query()
            ->leftJoin('departments', 'programs.department_id', '=', 'departments.id')
            ->select([
                'programs.id',
                'programs.name',
                'programs.code',
                'programs.description',
                'programs.department_id',
                'departments.name as department_name',
                'departments.code as department_code',
            ]);

        return DataTables::of($programs)
            ->editColumn('id', function ($row) {
                return Crypt::encryptString($row->id);
            })
            ->make(true);
    }

    public function getStats()
    {
        return response()->json([
            'total' => Program::count(),
            'departments_covered' => Program::query()->distinct('department_id')->count('department_id'),
        ]);
    }

    public function show($id)
    {
        try {
            $program = $this->findProgramOrFail($id);

            return response()->json([
                'id' => $id,
                'name' => $program->name,
                'code' => $program->code,
                'description' => $program->description,
                'department_id' => $program->department_id,
            ]);
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid program ID.'], 400);
        }
    }

    public function store(Request $request)
    {
        Program::create($this->validateProgram($request));

        return redirect()->back()->with('success', 'Program created successfully.');
    }

    public function update(Request $request, $id)
    {
        try {
            $program = $this->findProgramOrFail($id);
            $program->update($this->validateProgram($request, $program));

            return redirect()->back()->with('success', 'Program updated successfully.');
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid program ID.'], 400);
        }
    }

    public function destroy($id)
    {
        try {
            $program = $this->findProgramOrFail($id);

            $program->delete();

            return response()->json([
                'success' => true,
                'message' => 'Program deleted successfully.',
            ]);
        } catch (DecryptException) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid program ID.',
            ], 400);
        }
    }

    private function validateProgram(Request $request, ?Program $program = null): array
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
            'code' => strtoupper(trim((string) $request->input('code'))),
        ]);

        return $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('programs', 'name')
                    ->where(fn ($query) => $query->where('department_id', $request->input('department_id')))
                    ->ignore($program?->id),
            ],
            'code' => [
                'required',
                'string',
                'max:255',
                Rule::unique('programs', 'code')
                    ->where(fn ($query) => $query->where('department_id', $request->input('department_id')))
                    ->ignore($program?->id),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'department_id' => ['required', 'integer', 'exists:departments,id'],
        ]);
    }

    private function findProgramOrFail(string $id): Program
    {
        $decrypted = Crypt::decryptString($id);

        return Program::findOrFail($decrypted);
    }
}
