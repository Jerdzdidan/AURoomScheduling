<?php

use App\Http\Controllers\Admin\Utilities\AcademicPeriodController;
use App\Http\Controllers\Admin\Utilities\BranchController;
use App\Http\Controllers\Admin\Utilities\DepartmentController;
use App\Http\Controllers\Admin\Utilities\BuildingController;
use App\Http\Controllers\Admin\Core\RoomScheduleController;
use App\Http\Controllers\Admin\Core\SubjectController;
use App\Http\Controllers\Admin\Reports\RoomUtilizationController;
use App\Http\Controllers\Admin\Reports\ScheduleReassignmentController;
use App\Http\Controllers\Admin\UserManagement\UserController;
use App\Http\Controllers\Admin\Utilities\ProfessorController;
use App\Http\Controllers\Admin\Utilities\RoomController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Officer\OfficerScheduleController;
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
        Route::get('/', [UserController::class, 'index'])->name('index');
        Route::post('store', [UserController::class, 'store'])->name('store');
        Route::get('data', [UserController::class, 'getData'])->name('data');
        Route::get('stats', [UserController::class, 'getStats'])->name('stats');
        Route::get('{id}', [UserController::class, 'show'])->name('show');
        Route::put('{id}', [UserController::class, 'update'])->name('update');
        Route::post('toggle-status/{id}', [UserController::class, 'toggle'])->middleware(PreventSelfAction::class)->name('toggle');
        Route::delete('delete/{id}', [UserController::class, 'destroy'])->middleware(PreventSelfAction::class)->name('delete');
    });

    Route::prefix('core')->name('core.')->group(function () {
        Route::prefix('room-schedules')->name('room-schedules.')->group(function () {
            Route::get('/', [RoomScheduleController::class, 'index'])->name('index');
            Route::get('create', [RoomScheduleController::class, 'create'])->name('create');
            Route::get('edit/{id}', [RoomScheduleController::class, 'edit'])->name('edit');
            Route::get('data', [RoomScheduleController::class, 'getData'])->name('data');
            Route::get('stats', [RoomScheduleController::class, 'getStats'])->name('stats');
            Route::get('grid-data', [RoomScheduleController::class, 'getSchedules'])->name('grid-data');
            Route::get('available-rooms', [RoomScheduleController::class, 'getAvailableRooms'])->name('available-rooms');
            Route::post('store', [RoomScheduleController::class, 'store'])->name('store');
            Route::post('ajax-store', [RoomScheduleController::class, 'ajaxStore'])->name('ajax-store');
            Route::put('{id}', [RoomScheduleController::class, 'update'])->name('update');
            Route::post('transfer/{id}', [RoomScheduleController::class, 'transfer'])->name('transfer');
            Route::delete('delete/{id}', [RoomScheduleController::class, 'destroy'])->name('delete');
        });

        Route::prefix('subjects')->name('subjects.')->group(function () {
            Route::get('/', [SubjectController::class, 'index'])->name('index');
            Route::get('data', [SubjectController::class, 'getData'])->name('data');
            Route::get('stats', [SubjectController::class, 'getStats'])->name('stats');
            Route::get('import-template', [SubjectController::class, 'downloadImportTemplate'])->name('import-template');
            Route::post('import', [SubjectController::class, 'import'])->name('import');
            Route::post('store', [SubjectController::class, 'store'])->name('store');
            Route::get('{id}', [SubjectController::class, 'show'])->name('show');
            Route::put('{id}', [SubjectController::class, 'update'])->name('update');
            Route::delete('delete/{id}', [SubjectController::class, 'destroy'])->name('delete');
        });
    });

    Route::prefix('reports')->name('reports.')->group(function () {
        Route::prefix('room-utilization')->name('room-utilization.')->group(function () {
            Route::get('/', [RoomUtilizationController::class, 'index'])->name('index');
            Route::get('search', [RoomUtilizationController::class, 'search'])->name('search');
            Route::post('grid/open', [RoomUtilizationController::class, 'openGrid'])->name('grid.open');
            Route::post('grid/return', [RoomUtilizationController::class, 'returnFromGrid'])->name('grid.return');
            Route::get('grid', [RoomUtilizationController::class, 'grid'])->name('grid');
        });

        Route::prefix('schedule-reassignment')->name('schedule-reassignment.')->group(function () {
            Route::get('/', [ScheduleReassignmentController::class, 'index'])->name('index');
            Route::get('data', [ScheduleReassignmentController::class, 'getData'])->name('data');
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
            Route::get('/', [RoomController::class, 'index'])->name('index');
            Route::get('data', [RoomController::class, 'getData'])->name('data');
            Route::get('stats', [RoomController::class, 'getStats'])->name('stats');
            Route::post('store', [RoomController::class, 'store'])->name('store');
            Route::get('{id}', [RoomController::class, 'show'])->name('show');
            Route::put('{id}', [RoomController::class, 'update'])->name('update');
            Route::delete('delete/{id}', [RoomController::class, 'destroy'])->name('delete');
        });

        Route::prefix('professors')->name('professors.')->group(function () {
            Route::get('/', [ProfessorController::class, 'index'])->name('index');
            Route::get('data', [ProfessorController::class, 'getData'])->name('data');
            Route::get('stats', [ProfessorController::class, 'getStats'])->name('stats');
            Route::post('store', [ProfessorController::class, 'store'])->name('store');
            Route::get('{id}', [ProfessorController::class, 'show'])->name('show');
            Route::put('{id}', [ProfessorController::class, 'update'])->name('update');
            Route::delete('delete/{id}', [ProfessorController::class, 'destroy'])->name('delete');
        });
    });
});


// OFFICER PANEL
Route::prefix('officer')->middleware(['auth'])->name('officer.')->group(function () {
    // INDEX (Calendar Page)
    Route::get('/', [OfficerScheduleController::class, 'index'])->name('index');

    Route::prefix('schedules')->name('schedules.')->group(function () {
        Route::get('data', [OfficerScheduleController::class, 'getSchedules'])->name('data');
        Route::get('create', [OfficerScheduleController::class, 'create'])->name('create');
        Route::get('edit/{id}', [OfficerScheduleController::class, 'edit'])->name('edit');
        Route::post('store', [OfficerScheduleController::class, 'store'])->name('store');
        Route::post('ajax-store', [OfficerScheduleController::class, 'ajaxStore'])->name('ajax-store');
        Route::put('{id}', [OfficerScheduleController::class, 'update'])->name('update');
        Route::delete('delete/{id}', [OfficerScheduleController::class, 'destroy'])->name('delete');
        Route::get('available-rooms', [OfficerScheduleController::class, 'getAvailableRooms'])->name('available-rooms');
    });
});
