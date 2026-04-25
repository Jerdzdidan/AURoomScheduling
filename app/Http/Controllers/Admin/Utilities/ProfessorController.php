<?php

namespace App\Http\Controllers\Admin\Utilities;

use App\Http\Controllers\Controller;
use App\Models\Professor;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rule;
use Yajra\DataTables\DataTables;

class ProfessorController extends Controller
{
    public function index()
    {
        return inertia('Admin/Utilities/Professor');
    }

    public function getData()
    {
        $professors = Professor::query()
            ->select(['id', 'name']);

        return DataTables::of($professors)
            ->filter(function ($query) {
                $search = request()->input('search.value');

                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('professors.name', 'like', "%{$search}%");
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
            'total' => Professor::count(),
        ]);
    }

    public function show($id)
    {
        try {
            $professor = $this->findProfessorOrFail($id);

            return response()->json([
                'id' => $id,
                'name' => $professor->name,
            ]);
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid professor ID.'], 400);
        }
    }

    public function store(Request $request)
    {
        Professor::create($this->validateProfessor($request));

        return redirect()->back()->with('success', 'Professor created successfully.');
    }

    public function update(Request $request, $id)
    {
        try {
            $professor = $this->findProfessorOrFail($id);
            $professor->update($this->validateProfessor($request, $professor));

            return redirect()->back()->with('success', 'Professor updated successfully.');
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid professor ID.'], 400);
        }
    }

    public function destroy($id)
    {
        try {
            $professor = $this->findProfessorOrFail($id);

            $professor->delete();

            return response()->json([
                'success' => true,
                'message' => 'Professor deleted successfully.',
            ]);
        } catch (DecryptException) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid professor ID.',
            ], 400);
        }
    }

    private function validateProfessor(Request $request, ?Professor $professor = null): array
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
        ]);

        return $request->validate(
            [
                'name' => [
                    'required',
                    'string',
                    'max:255',
                    Rule::unique('professors', 'name')->ignore($professor?->id),
                ],
            ],
            [
                'name.unique' => 'This name is already in use, please choose another.',
            ]
        );
    }

    private function findProfessorOrFail(string $id): Professor
    {
        $decrypted = Crypt::decryptString($id);

        return Professor::findOrFail($decrypted);
    }
}
