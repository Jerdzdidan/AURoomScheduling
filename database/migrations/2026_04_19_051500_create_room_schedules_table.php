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
        Schema::create('room_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_period_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('professor_id')->nullable()->constrained()->nullOnDelete();
            $table->string('section');
            $table->enum('day_of_week', ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);
            $table->time('start_time');
            $table->time('end_time');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['academic_period_id', 'room_id', 'day_of_week'], 'room_schedules_period_room_day_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('room_schedules');
    }
};
