import { usePage, Head } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import Base from "@/Layouts/Base";
import StatsCard from "@/Components/Card/StatsCard";
import { LuUsersRound, LuUserRoundCheck, LuUserRoundX } from "react-icons/lu";
import { BiToggleLeft, BiSolidToggleRight, BiSolidEdit, BiSolidTrash } from "react-icons/bi";
import ScrollableTable from "@/Components/Table/ScrollableTable";
import CreateAndEditOfficer from "./Forms/CreateAndEditOfficer";

export default function Officer() {
    const { branches = [], departments = [] } = usePage().props;
    const tableRef = useRef(null);
    const [editId, setEditId] = useState(null);

    const loadStats = () => {
        $.get(route('admin.users.stats', 'OFFICER')).done((stats) => {
            $('#total').text(stats.total);
            $('#active').text(stats.active);
            $('#inactive').text(stats.inactive);
        });
    };

    useEffect(() => {
        loadStats();
        const heading = document.createElement("h5");
        heading.classList.add("card-title", "mb-0", "text-md-start", "text-center", "pb-md-0", "pb-6");
        heading.innerHTML = "Officer Accounts";

        const table = window.$('#officer-table').DataTable({
            processing: true,
            serverSide: true,
            responsive: true,
            scrollY: "405px",
            scrollX: true,
            layout: {
                topStart: {
                    rowClass: "row mx-3 my-0 justify-content-between",
                    features: [{
                        pageLength: {
                            menu: [10, 25, 50, 100],
                            text: "Show_MENU_entries"
                        }
                    }]
                },
                top2Start: {
                    rowClass: "row card-header flex-column flex-md-row pb-0",
                    features: [heading]
                },
                top2End: {
                    features: [{
                        buttons: [{
                            extend: "collection",
                            className: "btn btn-label-primary dropdown-toggle me-4",
                            text: '<span class="d-flex align-items-center gap-2"><i class="icon-base bx bx-export me-sm-1"></i> <span class="d-none d-sm-inline-block">Export</span></span>',
                            buttons: [{
                                extend: "csv",
                                text: '<span class="d-flex align-items-center"><i class="icon-base bx bx-file me-1"></i>Csv</span>',
                                className: "dropdown-item",
                                exportOptions: {
                                    columns: [1, 2, 3, 4],
                                    format: {
                                        body: function (e, t, a) {
                                            if (e.length <= 0)
                                                return e;
                                            e = (new DOMParser).parseFromString(e, "text/html");
                                            let s = "";
                                            var n = e.querySelectorAll(".user-name");
                                            return 0 < n.length ? n.forEach(e => {
                                                e = e.querySelector(".fw-medium")?.textContent || e.querySelector(".d-block")?.textContent || e.textContent;
                                                s += e.trim() + " "
                                            }
                                            ) : s = e.body.textContent || e.body.innerText,
                                                s.trim()
                                        }
                                    }
                                }
                            }]
                        }, {
                            text: '<span class="d-flex align-items-center gap-2"><i class="icon-base bx bx-plus icon-sm"></i> <span class="d-none d-sm-inline-block">Add New Record</span></span>',
                            className: "create-new btn btn-primary",
                            action: function () {
                                setEditId(null);
                                $('#officerOffcanvas').offcanvas('show');
                            }
                        }]
                    }]
                },
                topEnd: {
                    search: {
                        placeholder: ""
                    }
                },
                bottomStart: {
                    rowClass: "row mx-3 justify-content-between",
                    features: ["info"]
                },
                bottomEnd: {
                    paging: {
                        firstLast: false
                    }
                }
            },
            language: {
                paginate: {
                    next: '<i class="icon-base bx bx-chevron-right scaleX-n1-rtl icon-sm"></i>',
                    previous: '<i class="icon-base bx bx-chevron-left scaleX-n1-rtl icon-sm"></i>'
                }
            },
            autoWidth: false,
            ajax: route('admin.users.data', 'OFFICER'),
            columns: [
                { data: "id", visible: false },
                { data: "name", width: "22%" },
                { data: "email", width: "26%" },
                {
                    data: "department_name",
                    width: "20%",
                    render: (data, type, row) => data && data !== '-'
                        ? `
                            <div class="d-flex flex-column">
                                <span class="fw-medium">${data ?? '-'}</span>
                                <small class="text-muted mt-1">${row.department_code ?? ''}</small>
                                <small class="text-muted">${row.branch_code ?? ''}${row.branch_name ? ` - ${row.branch_name}` : ''}</small>
                            </div>
                        `
                        : '<span class="text-muted">Unassigned</span>',
                },
                {
                    data: "status",
                    width: "12%",
                    render: (data, type, row) => {
                        const status = row.status ? 'Active' : 'Inactive';
                        const badge = row.status ? 'success' : 'danger';
                        return `<span class="badge bg-label-${badge}">${status}</span>`;
                    }
                },
                {
                    data: null,
                    orderable: false,
                    width: "20%",
                    render: (data, type, row) => {
                        const toggleIcon = row.status
                            ? renderToString(<BiSolidToggleRight size={16} />)
                            : renderToString(<BiToggleLeft size={16} />);

                        const editIcon = renderToString(<BiSolidEdit size={16} />);
                        const deleteIcon = renderToString(<BiSolidTrash size={16} />);

                        return `
                            <button class="btn btn-sm btn-outline-primary" title="Toggle user status" onclick="officerCRUD.toggleStatus('${row.id}', '${row.name}')">
                                ${toggleIcon}
                            </button>

                            <button class="btn btn-sm btn-outline-warning mx-1" title="Edit user: ${row.name}" onclick="officerCRUD.edit('${row.id}')">
                                ${editIcon}
                            </button>

                            <button class="btn btn-sm btn-outline-danger" title="Delete user: ${row.name}" onclick="officerCRUD.delete('${row.id}', '${row.name}')">
                                ${deleteIcon}
                            </button>
                        `;
                    }
                }
            ],
        });

        tableRef.current = table;

        // Expose CRUD handlers globally for DataTable action buttons
        window.officerCRUD = window.officerCRUD || {};

        window.officerCRUD.edit = (id) => {
            setEditId(id);
            $('#officerOffcanvas').offcanvas('show');
        };

        window.officerCRUD.toggleStatus = (id, name) => {
            Swal.fire({
                title: 'Toggle Status',
                text: `Are you sure you want to toggle the status of "${name}"?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, toggle it',
                cancelButtonText: 'Cancel',
                customClass: {
                    confirmButton: 'btn btn-primary me-3',
                    cancelButton: 'btn btn-label-secondary',
                },
                buttonsStyling: false,
            }).then((result) => {
                if (result.isConfirmed) {
                    $.post(route('admin.users.toggle', id))
                        .done((res) => {
                            toastr.success(res.message || 'Status toggled successfully.');
                            tableRef.current?.ajax.reload(null, false);
                            loadStats();
                        })
                        .fail(() => {
                            toastr.error('Failed to toggle status.');
                        });
                }
            });
        };

        window.officerCRUD.delete = (id, name) => {
            Swal.fire({
                title: 'Delete Officer',
                text: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, delete',
                cancelButtonText: 'Cancel',
                customClass: {
                    confirmButton: 'btn btn-danger me-3',
                    cancelButton: 'btn btn-label-secondary',
                },
                buttonsStyling: false,
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: route('admin.users.delete', id),
                        type: 'DELETE',
                    })
                        .done((res) => {
                            toastr.success(res.message || 'Officer deleted successfully.');
                            tableRef.current?.ajax.reload(null, false);
                            loadStats();
                        })
                        .fail(() => {
                            toastr.error('Failed to delete officer.');
                        });
                }
            });
        };

        // Cleanup on unmount
        return () => {
            table.destroy();
            delete window.officerCRUD;
        };
    }, []);

    const handleSuccess = () => {
        setEditId(null);
        if (tableRef.current) {
            tableRef.current.ajax.reload(null, false);
        }
        loadStats();
    };

    return (
        <>
            <Head title="User Management > Officer" />

            <Base title="User Management > Officer">
                <div className="row mb-4">
                    <StatsCard
                        id="total"
                        title="Total Officers"
                        Icon={LuUsersRound}
                        iconSize="28"
                        bgColor="bg-primary"
                        className="col-md-4"
                    />

                    <StatsCard
                        id="active"
                        Icon={LuUserRoundCheck}
                        iconSize="28"
                        title="Active Officers"
                        bgColor="bg-success"
                        className="col-md-4"
                    />

                    <StatsCard
                        id="inactive"
                        Icon={LuUserRoundX}
                        iconSize="28"
                        title="Inactive Officers"
                        bgColor="bg-danger"
                        className="col-md-4"
                    />
                </div>

                <div className="card">
                    <div className="card-datatable text-nowrap">
                        <ScrollableTable id="officer-table">
                            <th>Id</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Department</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </ScrollableTable>
                    </div>
                </div>

                <CreateAndEditOfficer
                    editId={editId}
                    branches={branches}
                    departments={departments}
                    onSuccess={handleSuccess}
                />
            </Base>
        </>
    );
}
