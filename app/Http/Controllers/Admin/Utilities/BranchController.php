<?php

namespace App\Http\Controllers\Admin\Utilities;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rule;
use Yajra\DataTables\DataTables;

class BranchController extends Controller
{
    public function index()
    {
        return inertia('Admin/Utilities/Branch');
    }

    public function getData()
    {
        $branches = Branch::query()
            ->select(['id', 'name', 'code'])
            ->withCount('departments');

        return DataTables::of($branches)
            ->editColumn('id', function ($row) {
                return Crypt::encryptString($row->id);
            })
            ->make(true);
    }

    public function getStats()
    {
        return response()->json([
            'total' => Branch::count(),
            'in_use' => Branch::has('departments')->count(),
        ]);
    }

    public function show($id)
    {
        try {
            $branch = $this->findBranchOrFail($id);

            return response()->json([
                'id' => $id,
                'name' => $branch->name,
                'code' => $branch->code,
            ]);
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid branch ID.'], 400);
        }
    }

    public function store(Request $request)
    {
        Branch::create($this->validateBranch($request));

        return redirect()->back()->with('success', 'Branch created successfully.');
    }

    public function update(Request $request, $id)
    {
        try {
            $branch = $this->findBranchOrFail($id);
            $branch->update($this->validateBranch($request, $branch));

            return redirect()->back()->with('success', 'Branch updated successfully.');
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid branch ID.'], 400);
        }
    }

    public function destroy($id)
    {
        try {
            $branch = $this->findBranchOrFail($id);

            if ($branch->departments()->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This branch cannot be deleted while it still has departments.',
                ], 422);
            }

            $branch->delete();

            return response()->json([
                'success' => true,
                'message' => 'Branch deleted successfully.',
            ]);
        } catch (DecryptException) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid branch ID.',
            ], 400);
        }
    }

    private function validateBranch(Request $request, ?Branch $branch = null): array
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
                Rule::unique('branches', 'name')->ignore($branch?->id),
            ],
            'code' => [
                'required',
                'string',
                'max:255',
                Rule::unique('branches', 'code')->ignore($branch?->id),
            ],
        ]);
    }

    private function findBranchOrFail(string $id): Branch
    {
        $decrypted = Crypt::decryptString($id);

        return Branch::findOrFail($decrypted);
    }
}
