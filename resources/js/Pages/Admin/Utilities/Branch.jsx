import { Head } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import Base from "@/Layouts/Base";
import StatsCard from "@/Components/Card/StatsCard";
import ScrollableTable from "@/Components/Table/ScrollableTable";
import CreateAndEditBranch from "./Forms/CreateAndEditBranch";
import { LuDoorOpen, LuUniversity } from "react-icons/lu";
import { BiSolidEdit, BiSolidTrash } from "react-icons/bi";

export default function Branch() {
    const tableRef = useRef(null);
    const [editId, setEditId] = useState(null);

    const loadStats = () => {
        $.get(route('admin.utilities.branches.stats')).done((stats) => {
            $('#total').text(stats.total);
            $('#in-use').text(stats.in_use);
        });
    };

    useEffect(() => {
        loadStats();

        const heading = document.createElement("h5");
        heading.classList.add("card-title", "mb-0", "text-md-start", "text-center", "pb-md-0", "pb-6");
        heading.innerHTML = "Branches";

        const table = window.$('#branch-table').DataTable({
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
                                    columns: [1, 2, 3],
                                }
                            }]
                        }, {
                            text: '<span class="d-flex align-items-center gap-2"><i class="icon-base bx bx-plus icon-sm"></i> <span class="d-none d-sm-inline-block">Add New Record</span></span>',
                            className: "create-new btn btn-primary",
                            action: function () {
                                setEditId(null);
                                $('#branchOffcanvas').offcanvas('show');
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
            ajax: route('admin.utilities.branches.data'),
            columns: [
                { data: "id", visible: false },
                { data: "name", width: "34%" },
                { data: "code", width: "20%" },
                {
                    data: "departments_count",
                    width: "16%",
                    render: (data) => `<span class="badge bg-label-info">${data}</span>`,
                },
                {
                    data: null,
                    orderable: false,
                    width: "30%",
                    render: (data, type, row) => {
                        const editIcon = renderToString(<BiSolidEdit size={16} />);
                        const deleteIcon = renderToString(<BiSolidTrash size={16} />);

                        return `
                            <button class="btn btn-sm btn-outline-warning me-1" title="Edit branch: ${row.name}" onclick="branchCRUD.edit('${row.id}')">
                                ${editIcon}
                            </button>

                            <button class="btn btn-sm btn-outline-danger" title="Delete branch: ${row.name}" onclick="branchCRUD.delete('${row.id}', '${row.name}')">
                                ${deleteIcon}
                            </button>
                        `;
                    }
                }
            ],
        });

        tableRef.current = table;
        window.branchCRUD = window.branchCRUD || {};

        window.branchCRUD.edit = (id) => {
            setEditId(id);
            $('#branchOffcanvas').offcanvas('show');
        };

        window.branchCRUD.delete = (id, name) => {
            Swal.fire({
                title: 'Delete Branch',
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
                        url: route('admin.utilities.branches.delete', id),
                        type: 'DELETE',
                    })
                        .done((res) => {
                            toastr.success(res.message || 'Branch deleted successfully.');
                            tableRef.current?.ajax.reload(null, false);
                            loadStats();
                        })
                        .fail((xhr) => {
                            const message = xhr.responseJSON?.message || 'Failed to delete branch.';
                            toastr.error(message);
                        });
                }
            });
        };

        const $offcanvas = $('#branchOffcanvas');
        $offcanvas.on('hidden.bs.offcanvas', () => {
            setEditId(null);
        });

        return () => {
            $offcanvas.off('hidden.bs.offcanvas');
            table.destroy();
            delete window.branchCRUD;
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
            <Head title="Utilities > Branch" />

            <Base title="Utilities > Branch">
                <div className="row mb-4">
                    <StatsCard
                        id="total"
                        title="Total Branches"
                        Icon={LuUniversity}
                        iconSize="28"
                        bgColor="bg-primary"
                        className="col-md-6"
                    />

                    <StatsCard
                        id="in-use"
                        title="Branches In Use"
                        Icon={LuDoorOpen}
                        iconSize="28"
                        bgColor="bg-info"
                        className="col-md-6"
                    />
                </div>

                <div className="card">
                    <div className="card-datatable text-nowrap">
                        <ScrollableTable id="branch-table">
                            <th>Id</th>
                            <th>Name</th>
                            <th>Code</th>
                            <th>Departments</th>
                            <th>Actions</th>
                        </ScrollableTable>
                    </div>
                </div>

                <CreateAndEditBranch editId={editId} onSuccess={handleSuccess} />
            </Base>
        </>
    );
}
