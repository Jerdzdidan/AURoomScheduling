<?php

namespace App\Imports;

use App\Models\Department;
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
    private array $importedRows = [];
    private array $skippedRows = [];

    /**
     * Pre-load a lookup map: "BRANCH_CODE|DEPT_CODE" => department_id
     */
    private array $departmentLookup;

    public function __construct()
    {
        $this->departmentLookup = Department::query()
            ->join('branches', 'departments.branch_id', '=', 'branches.id')
            ->get([
                'departments.id',
                'departments.code as department_code',
                'branches.code as branch_code',
            ])
            ->keyBy(fn ($department) => strtoupper(trim($department->branch_code)) . '|' . strtoupper(trim($department->department_code)))
            ->map(fn ($department) => $department->id)
            ->toArray();
    }

    public function collection(Collection $rows): void
    {
        // Pre-load existing (code, department_id, class_type) combos to detect duplicates
        $existingCombos = Subject::query()
            ->select('code', 'department_id', 'class_type')
            ->get()
            ->map(fn ($s) => strtoupper(trim($s->code)) . '|' . $s->department_id . '|' . strtoupper(trim($s->class_type)))
            ->flip()
            ->toArray();

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2; // +2 because index is 0-based and row 1 is the header

            // --- Validate required fields ---
            $code         = strtoupper(trim($row['code'] ?? ''));
            $name         = trim($row['name'] ?? '');
            $branchCode   = strtoupper(trim($row['branch_code'] ?? ''));
            $deptCode     = strtoupper(trim($row['department_code'] ?? ''));
            $subjectType  = strtoupper(trim($row['subject_type'] ?? ''));
            $classType    = strtoupper(trim($row['class_type'] ?? ''));
            $rowDetails = [
                'row' => $rowNumber,
                'code' => $code,
                'name' => $name,
                'branch_code' => $branchCode,
                'department_code' => $deptCode,
                'subject_type' => $subjectType,
                'class_type' => $classType,
            ];

            if (empty($code) || empty($name) || empty($branchCode) || empty($deptCode) || empty($subjectType) || empty($classType)) {
                $this->recordSkippedRow($rowDetails, 'Missing required fields.');
                continue;
            }

            // --- Resolve department ---
            $lookupKey = "{$branchCode}|{$deptCode}";
            $departmentId = $this->departmentLookup[$lookupKey] ?? null;

            if (!$departmentId) {
                $this->recordSkippedRow(
                    $rowDetails,
                    "No department found for branch '{$branchCode}' and department '{$deptCode}'."
                );
                continue;
            }

            // --- Validate enums ---
            if (!in_array($subjectType, self::SUBJECT_TYPES, true)) {
                $this->recordSkippedRow(
                    $rowDetails,
                    "Invalid subject type '{$subjectType}'. Must be MAJOR or MINOR."
                );
                continue;
            }

            if (!in_array($classType, self::CLASS_TYPES, true)) {
                $this->recordSkippedRow(
                    $rowDetails,
                    "Invalid class type '{$classType}'. Must be LEC or LAB."
                );
                continue;
            }

            // --- Check duplicate (code + department_id + class_type) ---
            $comboKey = "{$code}|{$departmentId}|{$classType}";
            if (isset($existingCombos[$comboKey])) {
                $this->recordSkippedRow(
                    $rowDetails,
                    "Subject '{$code}' ({$classType}) already exists under branch '{$branchCode}' and department '{$deptCode}'."
                );
                continue;
            }

            // --- Insert ---
            Subject::create([
                'code'         => $code,
                'name'         => $name,
                'department_id'=> $departmentId,
                'subject_type' => $subjectType,
                'class_type'   => $classType,
            ]);

            // Track in memory so later rows in the same file don't duplicate
            $existingCombos[$comboKey] = true;
            $this->importedCount++;
            $this->importedRows[] = $rowDetails + ['message' => 'Imported successfully.'];
        }
    }

    private function recordSkippedRow(array $rowDetails, string $message): void
    {
        $this->skippedRows[] = $rowDetails + ['message' => $message];
        $this->skippedCount++;
    }

    public function getImportedCount(): int
    {
        return $this->importedCount;
    }

    public function getSkippedCount(): int
    {
        return $this->skippedCount;
    }

    public function getImportedRows(): array
    {
        return $this->importedRows;
    }

    public function getSkippedRows(): array
    {
        return $this->skippedRows;
    }

    public function getErrors(): array
    {
        return $this->skippedRows;
    }
}
