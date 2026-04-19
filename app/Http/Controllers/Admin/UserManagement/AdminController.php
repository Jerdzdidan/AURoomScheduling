<?php

namespace App\Http\Controllers\Admin\UserManagement;

use App\Http\Controllers\Controller;
use App\Models\User;
use Exception;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class AdminController extends Controller
{
    public function index()
    {
        return inertia('Admin/UserManagement/Admin');
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|string|email|max:255|unique:users,email',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        User::create([
            'name'      => $request->name,
            'email'     => $request->email,
            'password'  => $request->password,
            'user_type' => 'ADMIN',
            'status'    => true,
        ]);

        return redirect()->back()->with('success', 'Admin created successfully.');
    }

    public function show($id)
    {
        try {
            $decrypted = Crypt::decryptString($id);
            $user = User::findOrFail($decrypted);

            return response()->json([
                'id'    => $id,
                'name'  => $user->name,
                'email' => $user->email,
            ]);
        } catch (DecryptException $e) {
            return response()->json(['message' => 'Invalid user ID.'], 400);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $decrypted = Crypt::decryptString($id);
            $user = User::findOrFail($decrypted);

            $rules = [
                'name'  => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            ];

            if ($request->filled('password')) {
                $rules['password'] = ['confirmed', Rules\Password::defaults()];
            }

            $request->validate($rules);

            $user->name  = $request->name;
            $user->email = $request->email;

            if ($request->filled('password')) {
                $user->password = $request->password;
            }

            $user->save();

            return redirect()->back()->with('success', 'Admin updated successfully.');
        } catch (DecryptException $e) {
            return response()->json(['message' => 'Invalid user ID.'], 400);
        }
    }
}
