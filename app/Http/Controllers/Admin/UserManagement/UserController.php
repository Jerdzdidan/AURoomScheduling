<?php

namespace App\Http\Controllers\Admin\UserManagement;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\User;
use Exception;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Yajra\DataTables\DataTables;

class UserController extends Controller
{
    public function index()
    {
        return inertia('Admin/UserManagement/Users', [
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
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateUser($request);

        User::create($this->buildPayload($validated, true));

        return redirect()->back()->with('success', 'User created successfully.');
    }

    public function show($id)
    {
        try {
            $user = $this->findUserByEncryptedId($id);

            return response()->json([
                'id' => $id,
                'name' => $user->name,
                'email' => $user->email,
                'user_type' => $user->user_type,
                'department_id' => $user->department_id,
            ]);
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid user ID.'], 400);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $user = $this->findUserByEncryptedId($id);
            $validated = $this->validateUser($request, $user);

            $user->fill($this->buildPayload($validated));
            $user->save();

            return redirect()->back()->with('success', 'User updated successfully.');
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid user ID.'], 400);
        }
    }

    public function getData(Request $request)
    {
        $users = $this->baseUserQuery()
            ->leftJoin('departments', 'users.department_id', '=', 'departments.id')
            ->leftJoin('branches', 'departments.branch_id', '=', 'branches.id')
            ->select([
                'users.id',
                'users.name',
                'users.email',
                'users.department_id',
                'users.user_type',
                'users.status',
                'departments.name as department_name',
                'departments.code as department_code',
                'branches.name as branch_name',
                'branches.code as branch_code',
            ]);

        return DataTables::of($users)
            ->editColumn('id', function ($row) {
                return Crypt::encryptString((string) $row->id);
            })
            ->editColumn('department_name', function ($row) {
                return $row->department_name ?? '-';
            })
            ->editColumn('department_code', function ($row) {
                return $row->department_code ?? '';
            })
            ->editColumn('branch_name', function ($row) {
                return $row->branch_name ?? '';
            })
            ->editColumn('branch_code', function ($row) {
                return $row->branch_code ?? '';
            })
            ->filterColumn('department_name', function ($query, $keyword) {
                $query->where(function ($searchQuery) use ($keyword) {
                    $like = '%' . $keyword . '%';

                    $searchQuery->where('departments.name', 'like', $like)
                        ->orWhere('departments.code', 'like', $like)
                        ->orWhere('branches.name', 'like', $like)
                        ->orWhere('branches.code', 'like', $like);
                });
            })
            ->make(true);
    }

    public function getStats()
    {
        $baseQuery = $this->baseUserQuery();

        return response()->json([
            'total' => (clone $baseQuery)->count(),
            'active' => (clone $baseQuery)->where('status', true)->count(),
            'inactive' => (clone $baseQuery)->where('status', false)->count(),
        ]);
    }

    public function toggle($id)
    {
        try {
            $user = $this->findUserByEncryptedId($id);
            $user->status = !$user->status;
            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'User status toggled successfully.',
            ]);
        } catch (DecryptException) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid user ID. Could not toggle status.',
            ], 400);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Something went wrong: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $user = $this->findUserByEncryptedId($id);
            $user->delete();

            return response()->json([
                'success' => true,
                'message' => 'User deleted successfully.',
            ]);
        } catch (DecryptException) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid user ID.',
            ], 400);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Something went wrong: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function validateUser(Request $request, ?User $user = null): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user?->id)],
            'user_type' => ['required', Rule::in(['ADMIN', 'OFFICER'])],
            'department_id' => [
                'nullable',
                'integer',
                Rule::exists('departments', 'id'),
                Rule::requiredIf(fn () => $request->input('user_type') === 'OFFICER'),
            ],
        ];

        if ($user) {
            if ($request->filled('password')) {
                $rules['password'] = ['confirmed', Rules\Password::defaults()];
            }
        } else {
            $rules['password'] = ['required', 'confirmed', Rules\Password::defaults()];
        }

        return $request->validate($rules);
    }

    private function buildPayload(array $validated, bool $isCreating = false): array
    {
        $payload = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'user_type' => $validated['user_type'],
            'department_id' => $validated['user_type'] === 'OFFICER'
                ? $validated['department_id']
                : null,
        ];

        if ($isCreating) {
            $payload['status'] = true;
            $payload['password'] = $validated['password'];

            return $payload;
        }

        if (!empty($validated['password'])) {
            $payload['password'] = $validated['password'];
        }

        return $payload;
    }

    private function baseUserQuery()
    {
        return User::query()
            ->where('users.name', '!=', 'root');
    }

    private function findUserByEncryptedId(string $id): User
    {
        return User::findOrFail(Crypt::decryptString($id));
    }
}
