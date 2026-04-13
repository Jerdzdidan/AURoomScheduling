

export default function Table({ children, id }) {
    return (
        <div className="table-responsive">
            <table id={id} className="table table-hover" style={{ width: '100%' }}>
                <thead className="bg-body-secondary">
                    <tr>
                        {children}
                    </tr>
                </thead>
                <tbody
                    className="table-group-divider"
                    style={{ borderTop: '2px solid #9c9c9c' }}
                >
                    {/* Data will be loaded via AJAX */}
                </tbody>
            </table>
        </div>
    );
}
