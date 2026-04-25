import { Head, usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import Base from "@/Layouts/Base";
import StatsCard from "@/Components/Card/StatsCard";
import ScrollableTable from "@/Components/Table/ScrollableTable";
import CreateAndEditProgram from "./Forms/CreateAndEditProgram";
import { LuBookOpen, LuDoorOpen } from "react-icons/lu";
import { BiSolidEdit, BiSolidTrash } from "react-icons/bi";

export default function Program() {
    const { branches = [], departments = [] } = usePage().props;
    const tableRef = useRef(null);
    const [editId, setEditId] = useState(null);

    const loadStats = () => {
        $.get(route('admin.utilities.programs.stats')).done((stats) => {
            $('#total').text(stats.total);
            $('#departments-covered').text(stats.departments_covered);
        });
    };

    useEffect(() => {
        loadStats();

        const heading = document.createElement("h5");
        heading.classList.add("card-title", "mb-0", "text-md-start", "text-center", "pb-md-0", "pb-6");
        heading.innerHTML = "Programs";

        const table = window.$('#program-table').DataTable({
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
                                }
                            }]
                        }, {
                            text: '<span class="d-flex align-items-center gap-2"><i class="icon-base bx bx-plus icon-sm"></i> <span class="d-none d-sm-inline-block">Add New Record</span></span>',
                            className: "create-new btn btn-primary",
                            action: function () {
                                setEditId(null);
                                $('#programOffcanvas').offcanvas('show');
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
            ajax: route('admin.utilities.programs.data'),
            columns: [
                { data: "id", visible: false },
                { data: "name", width: "28%" },
                { data: "code", width: "14%" },
                {
                    data: "department_name",
                    width: "28%",
                    render: (data, type, row) => `
                        <div class="d-flex flex-column">
                            <span class="fw-medium">${data ?? '-'}</span>
                            <small class="text-muted">${row.department_code ?? ''}</small>
                            <small class="text-muted">${row.branch_code ?? ''}${row.branch_name ? ` - ${row.branch_name}` : ''}</small>
                        </div>
                    `,
                },
                {
                    data: "description",
                    width: "18%",
                    render: (data) => {
                        if (!data) return '<span class="text-muted">—</span>';
                        const truncated = data.length > 50 ? data.substring(0, 50) + '…' : data;
                        return `<span title="${data}">${truncated}</span>`;
                    },
                },
                {
                    data: null,
                    orderable: false,
                    width: "12%",
                    render: (data, type, row) => {
                        const editIcon = renderToString(<BiSolidEdit size={16} />);
                        const deleteIcon = renderToString(<BiSolidTrash size={16} />);

                        return `
                            <button class="btn btn-sm btn-outline-warning me-1" title="Edit program: ${row.name}" onclick="programCRUD.edit('${row.id}')">
                                ${editIcon}
                            </button>

                            <button class="btn btn-sm btn-outline-danger" title="Delete program: ${row.name}" onclick="programCRUD.delete('${row.id}', '${row.name}')">
                                ${deleteIcon}
                            </button>
                        `;
                    }
                }
            ],
        });

        tableRef.current = table;
        window.programCRUD = window.programCRUD || {};

        window.programCRUD.edit = (id) => {
            setEditId(id);
            $('#programOffcanvas').offcanvas('show');
        };

        window.programCRUD.delete = (id, name) => {
            Swal.fire({
                title: 'Delete Program',
                text: `Are you sure you want to delete "${name}"?`,
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
                        url: route('admin.utilities.programs.delete', id),
                        type: 'DELETE',
                    })
                        .done((res) => {
                            toastr.success(res.message || 'Program deleted successfully.');
                            tableRef.current?.ajax.reload(null, false);
                            loadStats();
                        })
                        .fail((xhr) => {
                            const message = xhr.responseJSON?.message || 'Failed to delete program.';
                            toastr.error(message);
                        });
                }
            });
        };

        const $offcanvas = $('#programOffcanvas');
        $offcanvas.on('hidden.bs.offcanvas', () => {
            setEditId(null);
        });

        return () => {
            $offcanvas.off('hidden.bs.offcanvas');
            table.destroy();
            delete window.programCRUD;
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
            <Head title="Utilities > Program" />

            <Base title="Utilities > Program">
                <div className="row mb-4">
                    <StatsCard
                        id="total"
                        title="Total Programs"
                        Icon={LuBookOpen}
                        iconSize="28"
                        bgColor="bg-primary"
                        className="col-md-6"
                    />

                    <StatsCard
                        id="departments-covered"
                        title="Departments Covered"
                        Icon={LuDoorOpen}
                        iconSize="28"
                        bgColor="bg-success"
                        className="col-md-6"
                    />
                </div>

                <div className="card">
                    <div className="card-datatable text-nowrap">
                        <ScrollableTable id="program-table">
                            <th>Id</th>
                            <th>Name</th>
                            <th>Code</th>
                            <th>Department</th>
                            <th>Description</th>
                            <th>Actions</th>
                        </ScrollableTable>
                    </div>
                </div>

                <CreateAndEditProgram
                    editId={editId}
                    branches={branches}
                    departments={departments}
                    onSuccess={handleSuccess}
                />
            </Base>
        </>
    );
}
