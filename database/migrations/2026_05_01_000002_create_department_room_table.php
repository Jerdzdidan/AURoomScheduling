<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('department_room', function (Blueprint $table) {
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->primary(['department_id', 'room_id']);
        });

        DB::table('department_room')->insertUsing(
            ['department_id', 'room_id'],
            DB::table('rooms')
                ->join('buildings', 'rooms.building_id', '=', 'buildings.id')
                ->join('departments', 'departments.branch_id', '=', 'buildings.branch_id')
                ->select('departments.id', 'rooms.id')
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('department_room');
    }
};
