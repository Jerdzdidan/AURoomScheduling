<?php

namespace App\Http\Controllers\Admin\Utilities;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rule;
use Yajra\DataTables\DataTables;

class DepartmentController extends Controller
{
    public function index()
    {
        return inertia('Admin/Utilities/Department', [
            'branches' => Branch::query()
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
        ]);
    }

    public function getData()
    {
        $departments = Department::query()
            ->leftJoin('branches', 'departments.branch_id', '=', 'branches.id')
            ->select([
                'departments.id',
                'departments.name',
                'departments.code',
                'departments.branch_id',
                'branches.name as branch_name',
                'branches.code as branch_code',
            ])
            ->withCount(['programs', 'users']);

        return DataTables::of($departments)
            ->editColumn('id', function ($row) {
                return Crypt::encryptString($row->id);
            })
            ->make(true);
    }

    public function getStats()
    {
        return response()->json([
            'total' => Department::count(),
            'branches_covered' => Department::query()->distinct('branch_id')->count('branch_id'),
        ]);
    }

    public function show($id)
    {
        try {
            $department = $this->findDepartmentOrFail($id);

            return response()->json([
                'id' => $id,
                'name' => $department->name,
                'code' => $department->code,
                'branch_id' => $department->branch_id,
            ]);
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid department ID.'], 400);
        }
    }

    public function store(Request $request)
    {
        Department::create($this->validateDepartment($request));

        return redirect()->back()->with('success', 'Department created successfully.');
    }

    public function update(Request $request, $id)
    {
        try {
            $department = $this->findDepartmentOrFail($id);
            $department->update($this->validateDepartment($request, $department));

            return redirect()->back()->with('success', 'Department updated successfully.');
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid department ID.'], 400);
        }
    }

    public function destroy($id)
    {
        try {
            $department = $this->findDepartmentOrFail($id);

            if ($department->programs()->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This department cannot be deleted while it still has programs.',
                ], 422);
            }

            if ($department->users()->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This department cannot be deleted while it still has assigned users.',
                ], 422);
            }

            $department->delete();

            return response()->json([
                'success' => true,
                'message' => 'Department deleted successfully.',
            ]);
        } catch (DecryptException) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid department ID.',
            ], 400);
        }
    }

    private function validateDepartment(Request $request, ?Department $department = null): array
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
                Rule::unique('departments', 'name')
                    ->where(fn ($query) => $query->where('branch_id', $request->input('branch_id')))
                    ->ignore($department?->id),
            ],
            'code' => [
                'required',
                'string',
                'max:255',
                Rule::unique('departments', 'code')
                    ->where(fn ($query) => $query->where('branch_id', $request->input('branch_id')))
                    ->ignore($department?->id),
            ],
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
        ]);
    }

    private function findDepartmentOrFail(string $id): Department
    {
        $decrypted = Crypt::decryptString($id);

        return Department::findOrFail($decrypted);
    }
}
