<?php

namespace App\Http\Controllers\Admin\UserManagement;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\User;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;

class OfficerController extends Controller
{
    public function index()
    {
        return inertia('Admin/UserManagement/Officer', [
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
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'          => 'required|string|max:255',
            'email'         => 'required|string|email|max:255|unique:users,email',
            'password'      => ['required', 'confirmed', Rules\Password::defaults()],
            'branch_id'     => 'required|integer|exists:branches,id',
            'department_id' => [
                'required',
                'integer',
                Rule::exists('departments', 'id')
                    ->where(fn ($query) => $query->where('branch_id', $request->input('branch_id'))),
            ],
        ]);

        User::create([
            'name'          => $request->name,
            'email'         => $request->email,
            'password'      => $request->password,
            'user_type'     => 'OFFICER',
            'status'        => true,
            'department_id' => $request->department_id,
        ]);

        return redirect()->back()->with('success', 'Officer created successfully.');
    }

    public function show($id)
    {
        try {
            $decrypted = Crypt::decryptString($id);
            $user = User::findOrFail($decrypted);

            return response()->json([
                'id'            => $id,
                'name'          => $user->name,
                'email'         => $user->email,
                'department_id' => $user->department_id,
            ]);
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid user ID.'], 400);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $decrypted = Crypt::decryptString($id);
            $user = User::findOrFail($decrypted);

            $rules = [
                'name'          => 'required|string|max:255',
                'email'         => 'required|string|email|max:255|unique:users,email,' . $user->id,
                'branch_id'     => 'required|integer|exists:branches,id',
                'department_id' => [
                    'required',
                    'integer',
                    Rule::exists('departments', 'id')
                        ->where(fn ($query) => $query->where('branch_id', $request->input('branch_id'))),
                ],
            ];

            if ($request->filled('password')) {
                $rules['password'] = ['confirmed', Rules\Password::defaults()];
            }

            $request->validate($rules);

            $user->name          = $request->name;
            $user->email         = $request->email;
            $user->department_id = $request->department_id;

            if ($request->filled('password')) {
                $user->password = $request->password;
            }

            $user->save();

            return redirect()->back()->with('success', 'Officer updated successfully.');
        } catch (DecryptException) {
            return response()->json(['message' => 'Invalid user ID.'], 400);
        }
    }
}
