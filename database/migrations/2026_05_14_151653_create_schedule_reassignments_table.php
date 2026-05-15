<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('schedule_reassignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_schedule_id')->constrained()->cascadeOnDelete();
            $table->foreignId('previous_room_id')->constrained('rooms')->cascadeOnDelete();
            $table->foreignId('new_room_id')->constrained('rooms')->cascadeOnDelete();
            $table->text('remarks');
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule_reassignments');
    }
};
