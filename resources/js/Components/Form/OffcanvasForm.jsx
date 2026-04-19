export default function OffcanvasForm({
    id,
    title,
    formClass = 'add-or-update-form',
    formId = 'add-or-update-form',
    onSubmit,
    encType,
    submitButtonName = 'Submit',
    children
}) {
    return (
        <div className="offcanvas offcanvas-end" id={id} tabIndex="-1" aria-labelledby={`${id}Label`}>
            <div className="offcanvas-header border-bottom">
                <h5 className="offcanvas-title" id={`${id}Label`}>{title}</h5>
                <button type="button" className="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div className="offcanvas-body flex-grow-1">
                <form
                    className={formClass}
                    id={formId}
                    onSubmit={onSubmit}
                    encType={encType}
                >
                    {children}

                    {/* Form Actions */}
                    <div className="col-sm-12 pt-2">
                        <div className="d-flex gap-2">
                            <button type="submit" className="btn btn-primary data-submit flex-fill">
                                {submitButtonName}
                            </button>
                            <button type="reset" className="btn btn-outline-secondary flex-fill" data-bs-dismiss="offcanvas">
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
