<?php

namespace App\Imports;

use App\Models\Program;
use App\Models\Subject;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class SubjectImport implements ToCollection, WithHeadingRow
{
    private const SUBJECT_TYPES = ['MAJOR', 'MINOR'];
    private const CLASS_TYPES = ['LEC', 'LAB'];

    private int $importedCount = 0;
    private int $skippedCount = 0;
    private array $errors = [];

    /**
     * Pre-load a lookup map: "BRANCH_CODE|DEPT_CODE|PROG_CODE" => program_id
     */
    private array $programLookup;

    public function __construct()
    {
        $this->programLookup = Program::query()
            ->join('departments', 'programs.department_id', '=', 'departments.id')
            ->join('branches', 'departments.branch_id', '=', 'branches.id')
            ->get([
                'programs.id',
                'programs.code as program_code',
                'departments.code as department_code',
                'branches.code as branch_code',
            ])
            ->keyBy(fn ($p) => strtoupper(trim($p->branch_code)) . '|' . strtoupper(trim($p->department_code)) . '|' . strtoupper(trim($p->program_code)))
            ->map(fn ($p) => $p->id)
            ->toArray();
    }

    public function collection(Collection $rows): void
    {
        // Pre-load existing (code, program_id, class_type) combos to detect duplicates
        $existingCombos = Subject::query()
            ->select('code', 'program_id', 'class_type')
            ->get()
            ->map(fn ($s) => strtoupper(trim($s->code)) . '|' . $s->program_id . '|' . strtoupper(trim($s->class_type)))
            ->flip()
            ->toArray();

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2; // +2 because index is 0-based and row 1 is the header

            // --- Validate required fields ---
            $code         = strtoupper(trim($row['code'] ?? ''));
            $name         = trim($row['name'] ?? '');
            $branchCode   = strtoupper(trim($row['branch_code'] ?? ''));
            $deptCode     = strtoupper(trim($row['department_code'] ?? ''));
            $programCode  = strtoupper(trim($row['program_code'] ?? ''));
            $subjectType  = strtoupper(trim($row['subject_type'] ?? ''));
            $classType    = strtoupper(trim($row['class_type'] ?? ''));

            if (empty($code) || empty($name) || empty($branchCode) || empty($deptCode) || empty($programCode) || empty($subjectType) || empty($classType)) {
                $this->errors[] = ['row' => $rowNumber, 'message' => 'Missing required fields.'];
                $this->skippedCount++;
                continue;
            }

            // --- Resolve program ---
            $lookupKey = "{$branchCode}|{$deptCode}|{$programCode}";
            $programId = $this->programLookup[$lookupKey] ?? null;

            if (!$programId) {
                $this->errors[] = [
                    'row' => $rowNumber,
                    'message' => "No program found for branch '{$branchCode}', department '{$deptCode}', program '{$programCode}'.",
                ];
                $this->skippedCount++;
                continue;
            }

            // --- Validate enums ---
            if (!in_array($subjectType, self::SUBJECT_TYPES, true)) {
                $this->errors[] = [
                    'row' => $rowNumber,
                    'message' => "Invalid subject type '{$subjectType}'. Must be MAJOR or MINOR.",
                ];
                $this->skippedCount++;
                continue;
            }

            if (!in_array($classType, self::CLASS_TYPES, true)) {
                $this->errors[] = [
                    'row' => $rowNumber,
                    'message' => "Invalid class type '{$classType}'. Must be LEC or LAB.",
                ];
                $this->skippedCount++;
                continue;
            }

            // --- Check duplicate (code + program_id + class_type) ---
            $comboKey = "{$code}|{$programId}|{$classType}";
            if (isset($existingCombos[$comboKey])) {
                $this->errors[] = [
                    'row' => $rowNumber,
                    'message' => "Subject '{$code}' ({$classType}) already exists under branch '{$branchCode}', department '{$deptCode}', program '{$programCode}'.",
                ];
                $this->skippedCount++;
                continue;
            }

            // --- Insert ---
            Subject::create([
                'code'         => $code,
                'name'         => $name,
                'program_id'   => $programId,
                'subject_type' => $subjectType,
                'class_type'   => $classType,
            ]);

            // Track in memory so later rows in the same file don't duplicate
            $existingCombos[$comboKey] = true;
            $this->importedCount++;
        }
    }

    public function getImportedCount(): int
    {
        return $this->importedCount;
    }

    public function getSkippedCount(): int
    {
        return $this->skippedCount;
    }

    public function getErrors(): array
    {
        return $this->errors;
    }
}
