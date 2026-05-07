<?php

namespace App\Http\Controllers\Admin\Utilities;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Building;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rule;
use Yajra\DataTables\DataTables;

class BuildingController extends Controller
{
    public function index()
    {
        return inertia('Admin/Utilities/Building', [
            'branches' => Branch::query()
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
        ]);
    }

    public function getData()
    {
        $buildings = Building::query()
            ->leftJoin('branches', 'buildings.branch_id', '=', 'branches.id')
            ->select([
                'buildings.id',
                'buildings.name',
                'buildings.code',
                'buildings.branch_id',
                'branches.name as branch_name',
                'branches.code as branch_code',
            ])
            ->withCount(['rooms']);

        if ($branchId = request()->input('filter_branch_id')) {
            $buildings->where('buildings.branch_id', $branchId);
        }

        return DataTables::of($buildings)
            ->filter(function ($query) {
                $search = request()->input('search.value');

                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('buildings.name', 'like', "%{$search}%")
                            ->orWhere('buildings.code', 'like', "%{$search}%")
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
            'total' => Building::count(),
            'branches_covered' => Building::query()->distinct('branch_id')->count('branch_id'),
        ]);
    }

    public function show($id)
    {
        try {
            $building = $this->findBuildingOrFail($id);

            return response()->json([
                'id' => $id,
                'name' => $building->name,
                'code' => $building->code,
                'branch_id' => $building->branch_id,
            ]);
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid building ID.'], 400);
        }
    }

    public function store(Request $request)
    {
        Building::create($this->validateBuilding($request));

        return redirect()->back()->with('success', 'Building created successfully.');
    }

    public function update(Request $request, $id)
    {
        try {
            $building = $this->findBuildingOrFail($id);
            $building->update($this->validateBuilding($request, $building));

            return redirect()->back()->with('success', 'Building updated successfully.');
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid building ID.'], 400);
        }
    }

    public function destroy($id)
    {
        try {
            $building = $this->findBuildingOrFail($id);

            if ($building->rooms()->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This building cannot be deleted while it still has rooms.',
                ], 422);
            }

            $building->delete();

            return response()->json([
                'success' => true,
                'message' => 'Building deleted successfully.',
            ]);
        } catch (DecryptException) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid building ID.',
            ], 400);
        }
    }

    private function validateBuilding(Request $request, ?Building $building = null): array
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
                Rule::unique('buildings', 'name')
                    ->where(fn($query) => $query->where('branch_id', $request->input('branch_id')))
                    ->ignore($building?->id),
            ],
            'code' => [
                'required',
                'string',
                'max:255',
                Rule::unique('buildings', 'code')
                    ->where(fn($query) => $query->where('branch_id', $request->input('branch_id')))
                    ->ignore($building?->id),
            ],
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
        ]);
    }

    private function findBuildingOrFail(string $id): Building
    {
        $decrypted = Crypt::decryptString($id);

        return Building::findOrFail($decrypted);
    }
}
