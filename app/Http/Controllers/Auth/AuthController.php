<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function index()
    {
        return inertia('Auth/index');
    }

    public function authenticate(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (Auth::attempt($credentials)) {
            $user = Auth::user();

            if (!$user->status) {
                Auth::logout();
                return back()->with('error', 'Your account is inactive.');
            }

            $request->session()->regenerate();

            if ($user->user_type == "OFFICER") {
                return Inertia::location(route('officer.index'));
            }

            return Inertia::location(route('admin.index'));
        }

        return back()->withErrors([
            'email' => 'Wrong email or password.',
        ])->onlyInput('email');
    }

    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return Inertia::location(route('auth.index'));
    }
}
