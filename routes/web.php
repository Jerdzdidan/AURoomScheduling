<?php

use App\Http\Controllers\Admin\Utilities\AcademicPeriodController;
use App\Http\Controllers\Admin\Utilities\BranchController;
use App\Http\Controllers\Admin\Utilities\DepartmentController;
use App\Http\Controllers\Admin\Utilities\ProgramController;
use App\Http\Controllers\Admin\Core\BuildingController;
use App\Http\Controllers\Admin\UserManagement\UserController;
use App\Http\Controllers\Admin\UserManagement\AdminController;
use App\Http\Controllers\Admin\UserManagement\OfficerController;
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
            Route::post('store', [AdminController::class, 'store'])->name('store');
            Route::get('{id}', [AdminController::class, 'show'])->name('show');
            Route::put('{id}', [AdminController::class, 'update'])->name('update');
        });

        // OFFICER ACCOUNTS ROUTES
        Route::prefix('officer-accounts')->name('officer-accounts.')->group(function () {
            Route::get('/', [OfficerController::class, 'index'])->name('index');
            Route::post('store', [OfficerController::class, 'store'])->name('store');
            Route::get('{id}', [OfficerController::class, 'show'])->name('show');
            Route::put('{id}', [OfficerController::class, 'update'])->name('update');
        });

        // GENERIC USER ROUTES
        Route::get('data/{user_type}', [UserController::class, 'getData'])->name('data');
        Route::get('stats/{user_type}', [UserController::class, 'getStats'])->name('stats');
        Route::post('toggle-status/{id}', [UserController::class, 'toggle'])->middleware(PreventSelfAction::class)->name('toggle');
        Route::delete('delete/{id}', [UserController::class, 'destroy'])->middleware(PreventSelfAction::class)->name('delete');
    });

    Route::prefix('core')->name('core.')->group(function () {
        Route::prefix('buildings')->name('buildings.')->group(function () {
            Route::get('/', [BuildingController::class, 'index'])->name('index');
            Route::get('data', [BuildingController::class, 'getData'])->name('data');
            Route::get('stats', [BuildingController::class, 'getStats'])->name('stats');
            Route::post('store', [BuildingController::class, 'store'])->name('store');
            Route::get('{id}', [BuildingController::class, 'show'])->name('show');
            Route::put('{id}', [BuildingController::class, 'update'])->name('update');
            Route::delete('delete/{id}', [BuildingController::class, 'destroy'])->name('delete');
        });

        Route::prefix('rooms')->name('rooms.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Admin\Core\RoomController::class, 'index'])->name('index');
            Route::get('data', [\App\Http\Controllers\Admin\Core\RoomController::class, 'getData'])->name('data');
            Route::get('stats', [\App\Http\Controllers\Admin\Core\RoomController::class, 'getStats'])->name('stats');
            Route::post('store', [\App\Http\Controllers\Admin\Core\RoomController::class, 'store'])->name('store');
            Route::get('{id}', [\App\Http\Controllers\Admin\Core\RoomController::class, 'show'])->name('show');
            Route::put('{id}', [\App\Http\Controllers\Admin\Core\RoomController::class, 'update'])->name('update');
            Route::delete('delete/{id}', [\App\Http\Controllers\Admin\Core\RoomController::class, 'destroy'])->name('delete');
        });

        Route::prefix('subjects')->name('subjects.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Admin\Core\SubjectController::class, 'index'])->name('index');
            Route::get('data', [\App\Http\Controllers\Admin\Core\SubjectController::class, 'getData'])->name('data');
            Route::get('stats', [\App\Http\Controllers\Admin\Core\SubjectController::class, 'getStats'])->name('stats');
            Route::post('store', [\App\Http\Controllers\Admin\Core\SubjectController::class, 'store'])->name('store');
            Route::get('{id}', [\App\Http\Controllers\Admin\Core\SubjectController::class, 'show'])->name('show');
            Route::put('{id}', [\App\Http\Controllers\Admin\Core\SubjectController::class, 'update'])->name('update');
            Route::delete('delete/{id}', [\App\Http\Controllers\Admin\Core\SubjectController::class, 'destroy'])->name('delete');
        });
    });

    Route::prefix('utilities')->name('utilities.')->group(function () {
        Route::prefix('academic-periods')->name('academic-periods.')->group(function () {
            Route::get('/', [AcademicPeriodController::class, 'index'])->name('index');
            Route::get('data', [AcademicPeriodController::class, 'getData'])->name('data');
            Route::get('stats', [AcademicPeriodController::class, 'getStats'])->name('stats');
            Route::post('store', [AcademicPeriodController::class, 'store'])->name('store');
            Route::post('set-current/{id}', [AcademicPeriodController::class, 'setCurrent'])->name('set-current');
            Route::get('{id}', [AcademicPeriodController::class, 'show'])->name('show');
            Route::put('{id}', [AcademicPeriodController::class, 'update'])->name('update');
            Route::delete('delete/{id}', [AcademicPeriodController::class, 'destroy'])->name('delete');
        });

        Route::prefix('branches')->name('branches.')->group(function () {
            Route::get('/', [BranchController::class, 'index'])->name('index');
            Route::get('data', [BranchController::class, 'getData'])->name('data');
            Route::get('stats', [BranchController::class, 'getStats'])->name('stats');
            Route::post('store', [BranchController::class, 'store'])->name('store');
            Route::get('{id}', [BranchController::class, 'show'])->name('show');
            Route::put('{id}', [BranchController::class, 'update'])->name('update');
            Route::delete('delete/{id}', [BranchController::class, 'destroy'])->name('delete');
        });

        Route::prefix('departments')->name('departments.')->group(function () {
            Route::get('/', [DepartmentController::class, 'index'])->name('index');
            Route::get('data', [DepartmentController::class, 'getData'])->name('data');
            Route::get('stats', [DepartmentController::class, 'getStats'])->name('stats');
            Route::post('store', [DepartmentController::class, 'store'])->name('store');
            Route::get('{id}', [DepartmentController::class, 'show'])->name('show');
            Route::put('{id}', [DepartmentController::class, 'update'])->name('update');
            Route::delete('delete/{id}', [DepartmentController::class, 'destroy'])->name('delete');
        });

        Route::prefix('programs')->name('programs.')->group(function () {
            Route::get('/', [ProgramController::class, 'index'])->name('index');
            Route::get('data', [ProgramController::class, 'getData'])->name('data');
            Route::get('stats', [ProgramController::class, 'getStats'])->name('stats');
            Route::post('store', [ProgramController::class, 'store'])->name('store');
            Route::get('{id}', [ProgramController::class, 'show'])->name('show');
            Route::put('{id}', [ProgramController::class, 'update'])->name('update');
            Route::delete('delete/{id}', [ProgramController::class, 'destroy'])->name('delete');
        });
    });
});
