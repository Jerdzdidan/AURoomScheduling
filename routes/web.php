<?php

use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\ProfileController;
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

// Route::view('auth', 'auth.index')->name('auth.index');
Route::prefix('auth')->group(function () {
    Route::get('/', [AuthController::class, 'index'])->name('auth.index');
    Route::post('login', [AuthController::class, 'authenticate'])->name('auth.authenticate');
    Route::get('logout', [AuthController::class, 'logout'])->name('auth.logout');
});

Route::prefix('admin')->middleware(['auth'])->name('admin.')->group(function () {
    Route::get('/', function () {
        return Inertia::render('Admin/Home');
    })->name('index');

    Route::prefix('users')->name('users.')->group(function () {
        Route::get('/', [UserController::class, 'index'])->name('index');
    });
});
