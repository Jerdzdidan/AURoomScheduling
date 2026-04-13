import { forwardRef } from 'react';

const ScrollableTable = forwardRef(({ children }, ref) => {
    return (
        <table ref={ref} className="dt-scrollableTable table table-bordered table-responsive">
            <thead>
                <tr>
                    {children}
                </tr>
            </thead>
            <tbody className="table-group-divider" style={{ borderTop: '2px solid #9c9c9c' }}>
                {/* Data will be loaded via AJAX  */}
            </tbody>
        </table>
    );
});

export default ScrollableTable;
