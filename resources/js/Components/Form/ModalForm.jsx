export default function ModalForm({
    id,
    title,
    subtitle,
    formClass = "add-or-update-form",
    formId = "add-or-update-form",
    onSubmit,
    encType,
    size = "modal-xl",
    dialogClassName = "",
    bodyClassName = "modal-body",
    footer,
    children,
}) {
    return (
        <div
            className="modal fade"
            id={id}
            tabIndex="-1"
            aria-labelledby={`${id}Label`}
            aria-hidden="true"
        >
            <div
                className={`modal-dialog ${size} modal-dialog-centered ${dialogClassName}`.trim()}
            >
                <div className="modal-content">
                    <div className="modal-header">
                        <div>
                            <h5 className="modal-title" id={`${id}Label`}>
                                {title}
                            </h5>
                            {subtitle && (
                                <p className="text-muted small mb-0 mt-1">
                                    {subtitle}
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                        />
                    </div>

                    <form
                        className={formClass}
                        id={formId}
                        onSubmit={onSubmit}
                        encType={encType}
                    >
                        <div className={bodyClassName}>{children}</div>

                        {footer && (
                            <div className="modal-footer">
                                {footer}
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
