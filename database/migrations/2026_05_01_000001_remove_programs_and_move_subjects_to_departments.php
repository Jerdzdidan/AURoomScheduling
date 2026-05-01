<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->foreignId('department_id')->nullable()->after('class_type')->constrained()->cascadeOnDelete();
        });

        DB::statement('
            UPDATE subjects
            INNER JOIN programs ON subjects.program_id = programs.id
            SET subjects.department_id = programs.department_id
        ');

        $duplicateGroups = DB::table('subjects')
            ->select(
                'department_id',
                'code',
                'class_type',
                DB::raw('COUNT(*) as duplicate_count')
            )
            ->whereNotNull('department_id')
            ->groupBy('department_id', 'code', 'class_type')
            ->having('duplicate_count', '>', 1)
            ->get();

        $duplicateGroups->each(function (object $group): void {
            $subjectIds = DB::table('subjects')
                ->where('department_id', $group->department_id)
                ->where('code', $group->code)
                ->where('class_type', $group->class_type)
                ->orderBy('id')
                ->pluck('id');

            $keepId = (int) $subjectIds->shift();

            if (!$keepId || $subjectIds->isEmpty()) {
                return;
            }

            DB::table('room_schedules')
                ->whereIn('subject_id', $subjectIds)
                ->update(['subject_id' => $keepId]);

            DB::table('subjects')
                ->whereIn('id', $subjectIds)
                ->delete();
        });

        Schema::table('subjects', function (Blueprint $table) {
            $table->dropForeign(['program_id']);
            $table->dropColumn('program_id');
        });

        DB::statement('ALTER TABLE subjects MODIFY department_id BIGINT UNSIGNED NOT NULL');

        Schema::table('subjects', function (Blueprint $table) {
            $table->unique(['department_id', 'code', 'class_type'], 'subjects_department_code_class_unique');
        });

        Schema::dropIfExists('programs');
    }

    public function down(): void
    {
        Schema::create('programs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code');
            $table->text('description')->nullable();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->unique(['name', 'department_id']);
            $table->unique(['code', 'department_id']);
            $table->timestamps();
        });

        Schema::table('subjects', function (Blueprint $table) {
            $table->foreignId('program_id')->nullable()->after('class_type')->constrained()->cascadeOnDelete();
        });

        DB::table('departments')
            ->select('id', 'name', 'code')
            ->orderBy('id')
            ->get()
            ->each(function (object $department): void {
                $programId = DB::table('programs')->insertGetId([
                    'name' => $department->name,
                    'code' => $department->code,
                    'description' => null,
                    'department_id' => $department->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('subjects')
                    ->where('department_id', $department->id)
                    ->update(['program_id' => $programId]);
            });

        DB::statement('ALTER TABLE subjects MODIFY program_id BIGINT UNSIGNED NOT NULL');

        Schema::table('subjects', function (Blueprint $table) {
            $table->dropUnique('subjects_department_code_class_unique');
            $table->dropForeign(['department_id']);
            $table->dropColumn('department_id');
        });
    }
};
