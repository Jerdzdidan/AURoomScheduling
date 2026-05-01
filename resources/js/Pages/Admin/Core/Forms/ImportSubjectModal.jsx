import { useEffect, useRef, useState } from 'react';
import ModalForm from '@/Components/Form/ModalForm';

export default function ImportSubjectModal({ onSuccess }) {
    const fileInputRef = useRef(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);
    const [activeResultType, setActiveResultType] = useState('imported');

    const resetState = () => {
        setResult(null);
        setImporting(false);
        setActiveResultType('imported');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const resolveInitialResultType = (response) => {
        if ((response.imported_rows?.length ?? 0) > 0) {
            return 'imported';
        }

        if ((response.skipped_rows?.length ?? 0) > 0) {
            return 'skipped';
        }

        return 'imported';
    };

    useEffect(() => {
        const $modal = $('#importSubjectModal');
        const handleHidden = () => {
            resetState();
        };

        $modal.on('hidden.bs.modal', handleHidden);

        return () => {
            $modal.off('hidden.bs.modal', handleHidden);
        };
    }, []);

    const handleImport = () => {
        const file = fileInputRef.current?.files?.[0];

        if (!file) {
            toastr.warning('Please select a file first.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setImporting(true);
        setResult(null);

        $.ajax({
            url: route('admin.core.subjects.import'),
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
        })
            .done((res) => {
                setResult(res);
                setActiveResultType(resolveInitialResultType(res));
                if (res.imported > 0) {
                    toastr.success(`${res.imported} subject(s) imported successfully.`);
                    if (onSuccess) onSuccess();
                }
                if (res.skipped > 0) {
                    toastr.warning(`${res.skipped} row(s) skipped.`);
                }
            })
            .fail((xhr) => {
                const message = xhr.responseJSON?.message || 'Import failed.';
                toastr.error(message);
            })
            .always(() => {
                setImporting(false);
            });
    };

    const selectedRows = activeResultType === 'imported'
        ? (result?.imported_rows ?? [])
        : (result?.skipped_rows ?? []);
    const showingSkippedRows = activeResultType === 'skipped';

    return (
        <ModalForm
            id="importSubjectModal"
            title="Import Subjects"
            formId="import-subject-form"
            onSubmit={(event) => {
                event.preventDefault();
                handleImport();
            }}
            size="modal-xl"
            footer={(
                <>
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        data-bs-dismiss="modal"
                    >
                        Close
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={importing}
                    >
                        {importing ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                Importing...
                            </>
                        ) : (
                            <>
                                <i className="icon-base bx bx-import me-1"></i>
                                Import
                            </>
                        )}
                    </button>
                </>
            )}
        >
            <div className="mb-3">
                <label htmlFor="import-file" className="form-label">
                    Select File (.csv, .xlsx, .xls)
                </label>
                <input
                    ref={fileInputRef}
                    type="file"
                    className="form-control"
                    id="import-file"
                    accept=".csv,.xlsx,.xls"
                />
            </div>

            {result && (
                <div className="mt-3">
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                        <button
                            type="button"
                            className={`badge border-0 rounded-pill px-3 py-2 ${
                                activeResultType === 'imported'
                                    ? 'bg-success'
                                    : 'bg-label-success'
                            }`}
                            onClick={() => setActiveResultType('imported')}
                            disabled={(result.imported_rows?.length ?? 0) === 0}
                            aria-pressed={activeResultType === 'imported'}
                        >
                            {result.imported} imported
                        </button>
                        <button
                            type="button"
                            className={`badge border-0 rounded-pill px-3 py-2 ${
                                activeResultType === 'skipped'
                                    ? 'bg-warning text-dark'
                                    : 'bg-label-warning'
                            }`}
                            onClick={() => setActiveResultType('skipped')}
                            disabled={(result.skipped_rows?.length ?? 0) === 0}
                            aria-pressed={activeResultType === 'skipped'}
                        >
                            {result.skipped} skipped
                        </button>
                        <small className="text-muted">
                            Click a badge to review the matching rows.
                        </small>
                    </div>

                    <div className="border rounded">
                        {selectedRows.length > 0 ? (
                            <div className="table-responsive" style={{ maxHeight: '420px' }}>
                                <table className="table table-sm align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Row</th>
                                            <th>Code</th>
                                            <th>Subject Name</th>
                                            <th>Branch</th>
                                            <th>Department</th>
                                            <th>Subject Type</th>
                                            <th>Class Type</th>
                                            <th>{showingSkippedRows ? 'Reason' : 'Status'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedRows.map((row) => (
                                            <tr key={`${activeResultType}-${row.row}-${row.code}-${row.class_type}`}>
                                                <td>
                                                    <span className="badge bg-label-secondary">
                                                        Row {row.row}
                                                    </span>
                                                </td>
                                                <td className="fw-medium">{row.code || '-'}</td>
                                                <td>{row.name || '-'}</td>
                                                <td>{row.branch_code || '-'}</td>
                                                <td>{row.department_code || '-'}</td>
                                                <td>{row.subject_type || '-'}</td>
                                                <td>{row.class_type || '-'}</td>
                                                <td className={showingSkippedRows ? 'text-danger' : 'text-success'}>
                                                    {row.message}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-4 text-center text-muted">
                                No {activeResultType} rows to display.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </ModalForm>
    );
}
