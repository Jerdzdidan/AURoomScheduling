class GenericDataTable {
    constructor(config) {
        this.tableId = config.tableId;
        this.ajaxUrl = config.ajaxUrl;
        this.ajaxData = config.ajaxData || null;
        this.columns = config.columns;
        this.statsCards = config.statsCards || null;
        this.table = null;
        this.order = config.order || [[1, "asc"]];
        this.lengthMenu = config.lengthMenu || null;
        this.initComplete = config.initComplete || null;
    }
    
    init() {
        this.table = $(`#${this.tableId}`).DataTable({
            processing: true,
            serverSide: true,
            responsive: true,
            ajax: {
                url: this.ajaxUrl,
                type: "GET",
                ...(this.ajaxData !== null && { data: this.ajaxData }),
                error: (xhr, error) => {
                    console.error('Error:', error);
                    if (xhr.status === 500) {
                        const msg = xhr.responseJSON?.message || 'Internal server error';
                        toastr.error(msg, 'Server Error');
                        return;
                    }
                    toastr.error('Error loading data. Please refresh.');
                }
            },
            columns: this.columns,
            order: this.order,
            pageLength: 10,
            lengthMenu: this.lengthMenu || [10, 25, 50, 100],
            language: {
                processing: '<div class="spinner-border text-primary"></div> Loading...',
                emptyTable: "No records available"
            },
            drawCallback: () => {
                if (this.statsCards) this.updateStats();
            },
            initComplete: () => {
                if (this.initComplete) this.initComplete(this.table);
            }
        });
        
        return this;
    }
    
    updateStats() {
        const info = this.table.page.info();
        if (this.statsCards.total) {
            $(`#${this.statsCards.total}`).text(info.recordsTotal);
        }
        
        // Custom stats logic can be passed
        if (this.statsCards.callback) {
            this.statsCards.callback(this.table);
        }
    }
    
    reload() {
        this.table.ajax.reload(null, false);
    }
}