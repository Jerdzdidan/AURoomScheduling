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
        Schema::create('schedule_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_schedule_id')->constrained()->cascadeOnDelete();
            $table->foreignId('previous_room_id')->constrained('rooms')->cascadeOnDelete();
            $table->foreignId('transferred_room_id')->constrained('rooms')->cascadeOnDelete();
            $table->text('remarks');
            $table->foreignId('transferred_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('transferred_at');
            $table->timestamps();

            $table->index('room_schedule_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule_transfers');
    }
};
