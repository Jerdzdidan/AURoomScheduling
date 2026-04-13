<?php

use App\Http\Controllers\Admin\UserManagement\UserController;
use App\Http\Controllers\Admin\UserManagement\AdminController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Middleware\PreventSelfAction;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Route::get('/', function () {
//     return Inertia::render('Welcome', [
//         'canLogin' => Route::has('login'),
//         'canRegister' => Route::has('register'),
//         'laravelVersion' => Application::VERSION,
//         'phpVersion' => PHP_VERSION,
//     ]);
// });

// Route::get('/dashboard', function () {
//     return Inertia::render('Dashboard');
// })->middleware(['auth', 'verified'])->name('dashboard');
//
// Route::middleware('auth')->group(function () {
//     Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
//     Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
//     Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
// });

Route::get('/', function () {
    if (!auth()->check()) {
        return redirect()->route('auth.index');
    }

    return match (auth()->user()->user_type) {
        'ADMIN'   => Inertia::location(route('admin.index')),
        'OFFICER' => Inertia::location(route('officer.index')),
        default   => Inertia::location(route('auth.index'))
    };
})->name('_');

// Route::view('auth', 'auth.index')->name('auth.index');
// AUTHENTICATION (LOGIN, LOGOUT)
Route::prefix('auth')->group(function () {
    Route::get('/', [AuthController::class, 'index'])->name('auth.index');
    Route::post('login', [AuthController::class, 'authenticate'])->name('auth.authenticate');
    Route::get('logout', [AuthController::class, 'logout'])->name('auth.logout');
});

// ADMIN PANEL
Route::prefix('admin')->middleware(['auth'])->name('admin.')->group(function () {
    // HOME
    Route::get('/', function () {
        return Inertia::render('Admin/Home');
    })->name('index');

    Route::prefix('users')->name('users.')->group(function () {
        // ADMIN ACCOUNTS ROUTES
        Route::prefix('admin-accounts')->name('admin-accounts.')->group(function () {
            Route::get('/', [AdminController::class, 'index'])->name('index');
        });

        // GENERIC USER ROUTES
        Route::get('data/{user_type}', [UserController::class, 'getData'])->name('users.data');
        Route::get('stats/{user_type}', [UserController::class, 'getStats'])->name('users.stats');
        Route::post('toggle-status/{id}', [UserController::class, 'toggle'])->middleware(PreventSelfAction::class)->name('users.toggle');
    });
});
