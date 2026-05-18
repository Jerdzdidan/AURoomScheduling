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
        // Clean up old transfer columns from previous iteration
        Schema::table('room_schedules', function (Blueprint $table) {
            $columnsToDrop = [];

            if (Schema::hasColumn('room_schedules', 'transfer_marked_by_user_id')) {
                $table->dropForeign(['transfer_marked_by_user_id']);
                $columnsToDrop[] = 'transfer_marked_by_user_id';
            }

            if (Schema::hasColumn('room_schedules', 'status')) {
                $columnsToDrop[] = 'status';
            }

            if (Schema::hasColumn('room_schedules', 'transfer_marked_at')) {
                $columnsToDrop[] = 'transfer_marked_at';
            }

            if (Schema::hasColumn('room_schedules', 'is_transferred')) {
                $columnsToDrop[] = 'is_transferred';
            }

            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });

        // Ensure transfer_status and transfer_remarks exist
        if (!Schema::hasColumn('room_schedules', 'transfer_status')) {
            Schema::table('room_schedules', function (Blueprint $table) {
                $table->enum('transfer_status', ['TO_TRANSFER', 'TRANSFERRED'])->nullable()->default(null)->after('notes');
            });
        }

        if (!Schema::hasColumn('room_schedules', 'transfer_remarks')) {
            Schema::table('room_schedules', function (Blueprint $table) {
                $table->text('transfer_remarks')->nullable()->after('transfer_status');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('room_schedules', function (Blueprint $table) {
            if (Schema::hasColumn('room_schedules', 'transfer_status')) {
                $table->dropColumn('transfer_status');
            }
            if (Schema::hasColumn('room_schedules', 'transfer_remarks')) {
                $table->dropColumn('transfer_remarks');
            }
        });
    }
};
