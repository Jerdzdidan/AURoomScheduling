import { useRef, useState } from 'react';

export default function ImportSubjectModal({ onSuccess }) {
    const fileInputRef = useRef(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);

    const resetState = () => {
        setResult(null);
        setImporting(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

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

    return (
        <div
            className="modal fade"
            id="importSubjectModal"
            tabIndex="-1"
            aria-labelledby="importSubjectModalLabel"
            aria-hidden="true"
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title" id="importSubjectModalLabel">
                            Import Subjects
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                            onClick={resetState}
                        />
                    </div>

                    <div className="modal-body">
                        {/* Download Template */}
                        {/* <div className="mb-4"> */}
                        {/*     <p className="mb-2 text-muted"> */}
                        {/*         Download the template, fill it out, then upload below. */}
                        {/*     </p> */}
                        {/*     <a */}
                        {/*         href={route('admin.core.subjects.import-template')} */}
                        {/*         className="btn btn-outline-primary btn-sm" */}
                        {/*         download */}
                        {/*     > */}
                        {/*         <i className="icon-base bx bx-download me-1"></i> */}
                        {/*         Download Template */}
                        {/*     </a> */}
                        {/* </div> */}

                        {/* File Input */}
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

                        {/* Results */}
                        {result && (
                            <div className="mt-3">
                                <div className="d-flex gap-2 mb-3">
                                    <span className="badge bg-label-success">
                                        {result.imported} imported
                                    </span>
                                    <span className="badge bg-label-warning">
                                        {result.skipped} skipped
                                    </span>
                                </div>

                                {result.errors?.length > 0 && (
                                    <div className="border rounded p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        <small className="fw-semibold text-danger d-block mb-2">
                                            Row Errors:
                                        </small>
                                        {result.errors.map((err, i) => (
                                            <div key={i} className="d-flex gap-2 mb-1">
                                                <span className="badge bg-label-danger">
                                                    Row {err.row}
                                                </span>
                                                <small className="text-muted">{err.message}</small>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            data-bs-dismiss="modal"
                            onClick={resetState}
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleImport}
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
                    </div>
                </div>
            </div>
        </div>
    );
}
