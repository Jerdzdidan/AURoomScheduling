class GenericCRUD {
    constructor(config) {
        this.baseUrl = config.baseUrl;
        this.storeUrl = config.storeUrl;
        this.editUrl = config.editUrl;
        this.updateUrl = config.updateUrl;
        this.destroyUrl = config.destroyUrl;
        this.toggleUrl = config.toggleUrl;
        this.entityName = config.entityName;
        this.dataTable = config.dataTable;
        this.csrfToken = config.csrfToken;
        this.$modal = $(config.modal);
        this.$form = $(config.form);

        this.$modal.on('hidden.bs.offcanvas hidden.bs.modal', () => {
            this.$form.trigger('reset');
            this.$form.find('input[name="id"]').val('');

            this.$modal.find('.offcanvas-title').text(`New ${this.entityName}`);
            this.$form.find('button[type="submit"]').text('Submit');
        });
    }

    async view(id) {
        $.ajax({
            url: `${this.baseUrl}/${id}`,
            method: 'GET',
            success: async (response) => {
                // Trigger custom callback if provided (now supports async)
                if (this.onViewSuccess) await this.onViewSuccess(response);
            },
            error: () => toastr.error(`Failed to load ${this.entityName}`)
        });
    }
    
    async edit(id) {
        const url = this.editUrl.replace(':id', id);
        
        $.ajax({
            url: url,
            method: 'GET',
            success: async (response) => {
                this.$modal.offcanvas('show');
                
                this.$modal.find('.offcanvas-title').text(`Edit ${this.entityName}`);
                this.$form.find('button[type="submit"]').text(`Update ${this.entityName}`);

                // Support async callback
                if (this.onEditSuccess) await this.onEditSuccess(response);
            },
            error: (xhr) => {
                if (xhr.status === 403) {
                    const msg = xhr.responseJSON?.message || 'Action forbidden';
                    toastr.error(msg, 'Forbidden');
                    return;
                }

                if (xhr.status === 500) {
                    const msg = xhr.responseJSON?.message || 'Internal server error';
                    toastr.error(msg, 'Server Error');
                    return;
                }
                
                toastr.error(`Failed to load ${this.entityName}`);
            }
        });
    }
    
    async create(formData) {
        $.ajax({
            url: `${this.storeUrl}`,
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: { 'X-CSRF-TOKEN': this.csrfToken },
            success: async (response) => {
                toastr.success(`${this.entityName} created successfully`);
                if (this.onCreateSuccess) await this.onCreateSuccess(response);
                this.$modal.offcanvas('hide');  
                this.$form[0].reset();
                this.dataTable.reload();
            },
            error: (xhr) => {
                if (xhr.status === 422) {
                    let errors = {};
                    try {
                        const json = xhr.responseJSON ?? JSON.parse(xhr.responseText);
                        errors = json?.errors ?? {};
                    } catch (e) {
                        console.error('Could not parse error JSON', e);
                    }

                    const allMessages = Object.values(errors)     
                        .flat()                              
                        .map(msg => `<li>${msg}</li>`) 
                        .join('');  

                    const htmlMessage = `<ul style="margin:0; padding-left:20px;">${allMessages}</ul>`;

                    if (htmlMessage) {
                        toastr.error(htmlMessage, 'Validation Error:', {
                            closeButton: true,
                            progressBar: true,
                            timeOut: 5000,
                            extendedTimeOut: 2000,
                            escapeHtml: false
                        });
                    } else {
                        toastr.error('Please check your input.', 'Validation Error');
                    }
                    return;
                }

                if (xhr.status === 500) {
                    const msg = xhr.responseJSON?.message || 'Internal server error';
                    toastr.error(msg, 'Server Error');
                    return;
                }

                toastr.error(`Failed to create ${this.entityName}`);
            }
        });
    }
    
    async update(id, formData) {
        const url = this.updateUrl.replace(':id', id);
        
        $.ajax({
            url: url,
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: { 'X-CSRF-TOKEN': this.csrfToken },
            success: async (response) => {
                toastr.success(`${this.entityName} updated successfully`);
                if (this.onUpdateSuccess) await this.onUpdateSuccess(response);
                this.$modal.offcanvas('hide');  
                this.$form[0].reset();
                this.dataTable.reload();
            },
            error: (xhr) => {
                if (xhr.status === 422) {
                    let errors = {};
                    try {
                        const json = xhr.responseJSON ?? JSON.parse(xhr.responseText);
                        errors = json?.errors ?? {};
                    } catch (e) {
                        console.error('Could not parse error JSON', e);
                    }

                    const allMessages = Object.values(errors)     
                        .flat()                              
                        .map(msg => `<li>${msg}</li>`) 
                        .join('');  

                    const htmlMessage = `<ul style="margin:0; padding-left:20px;">${allMessages}</ul>`;

                    if (htmlMessage) {
                        toastr.error(htmlMessage, 'Validation Error:', {
                            closeButton: true,
                            progressBar: true,
                            timeOut: 5000,
                            extendedTimeOut: 2000,
                            escapeHtml: false
                        });
                    } else {
                        toastr.error('Please check your input.', 'Validation Error');
                    }
                    return;
                }

                if (xhr.status === 500) {
                    const msg = xhr.responseJSON?.message || 'Internal server error';
                    toastr.error(msg, 'Server Error');
                    return;
                }

                if (xhr.status === 403) {
                    const msg = xhr.responseJSON?.message || 'Action forbidden';
                    toastr.error(msg, 'Forbidden');
                    return;
                }

                toastr.error(`Failed to create ${this.entityName}`);
            }
        });
    }
    
    delete(id, name) {
        const url = this.destroyUrl.replace(':id', id);

        Swal.fire({
            title: 'Confirm Delete',
            html: `Are you sure you want to delete <span class="text-danger">${name}</span>?`,
            icon: "error",
            showCancelButton: true,
            confirmButtonColor: "#F27474",
            cancelButtonColor: "#91a8b3ff",
            confirmButtonText: "Confirm",
            cancelButtonText: "Cancel"
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: url,
                    method: 'DELETE',
                    headers: { 'X-CSRF-TOKEN': this.csrfToken },
                    success: async (response) => {
                        toastr.success(`${this.entityName} deleted successfully`);
                        if (this.onDeleteSuccess) await this.onDeleteSuccess(response);
                        this.dataTable.reload();
                    },
                    error: (xhr) => {
                        if (xhr.status === 403) {
                            const msg = xhr.responseJSON?.message || 'Action forbidden';
                            toastr.error(msg, 'Forbidden');
                            return;
                        }

                        if (xhr.status === 500) {
                            const msg = xhr.responseJSON?.message || 'Internal server error';
                            toastr.error(msg, 'Server Error');
                            return;
                        }

                        if (xhr.status === 422) {
                            const msg = xhr.responseJSON?.message || 'Cannot delete this record';
                            toastr.error(msg, 'Cannot Delete', {
                                closeButton: true,
                                timeOut: 7000,
                                extendedTimeOut: 3000
                            });
                            return;
                        }
                        
                        toastr.error(`Failed to delete ${this.entityName}`);
                    }
                });
            }
        });
    }

    toggleStatus(id, name) {
        const url = this.toggleUrl.replace(':id', id);

        Swal.fire({
            title: 'Confirm Toggle Status',
            html: `Are you sure you want to toggle status: <span class="text-info">${name}</span>?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#F8BB86",
            cancelButtonColor: "#91a8b3ff",
            confirmButtonText: "Confirm",
            cancelButtonText: "Cancel"
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: url,
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': this.csrfToken },
                    success: (response) => {
                        toastr.success(response.message || "Status updated!");
                        this.dataTable.reload();
                    },
                    error: (xhr) => {
                        if (xhr.status === 403) {
                            const msg = xhr.responseJSON?.message || 'Action forbidden';
                            toastr.error(msg, 'Forbidden');
                            return;
                        }

                        if (xhr.status === 500) {
                            const msg = xhr.responseJSON?.message || 'Internal server error';
                            toastr.error(msg, 'Server Error');
                            return;
                        }
                        
                        toastr.error(`Failed to toggle ${this.entityName}`);
                    }
                });
            }
        });
    }
}

const loadingOverlay = `
    <div id="loading-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.9); z-index: 9999; display: flex; align-items: center; justify-content: center;">
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    </div>
`;