import { Head, usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import Base from "@/Layouts/Base";
import StatsCard from "@/Components/Card/StatsCard";
import ScrollableTable from "@/Components/Table/ScrollableTable";
import CreateAndEditRoom from "./Forms/CreateAndEditRoom";
import { LuDoorOpen, LuBuilding2 } from "react-icons/lu";
import { BiSolidEdit, BiSolidTrash } from "react-icons/bi";

export default function Room() {
    const { branches = [], buildings = [] } = usePage().props;
    const tableRef = useRef(null);
    const [editId, setEditId] = useState(null);

    const loadStats = () => {
        $.get(route('admin.core.rooms.stats')).done((stats) => {
            $('#total').text(stats.total);
            $('#buildings-covered').text(stats.buildings_covered);
        });
    };

    useEffect(() => {
        loadStats();

        const heading = document.createElement("h5");
        heading.classList.add("card-title", "mb-0", "text-md-start", "text-center", "pb-md-0", "pb-6");
        heading.innerHTML = "Rooms";

        const table = window.$('#room-table').DataTable({
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
                                $('#roomOffcanvas').offcanvas('show');
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
            ajax: route('admin.core.rooms.data'),
            columns: [
                { data: "id", visible: false },
                { data: "code", width: "25%" },
                {
                    data: "type",
                    width: "25%",
                    render: (data) => {
                        return `<span class="badge bg-label-primary">${data}</span>`;
                    }
                },
                {
                    data: "building_name",
                    width: "35%",
                    render: (data, type, row) => `
                        <div class="d-flex flex-column">
                            <span class="fw-medium">${data ?? '-'}</span>
                            <small class="text-muted">${row.building_code ?? ''}</small>
                            <small class="text-muted">${row.branch_code ?? ''}${row.branch_name ? ` - ${row.branch_name}` : ''}</small>
                        </div>
                    `,
                },
                {
                    data: null,
                    orderable: false,
                    width: "15%",
                    render: (data, type, row) => {
                        const editIcon = renderToString(<BiSolidEdit size={16} />);
                        const deleteIcon = renderToString(<BiSolidTrash size={16} />);

                        return `
                            <button class="btn btn-sm btn-outline-warning me-1" title="Edit room: ${row.code}" onclick="roomCRUD.edit('${row.id}')">
                                ${editIcon}
                            </button>

                            <button class="btn btn-sm btn-outline-danger" title="Delete room: ${row.code}" onclick="roomCRUD.delete('${row.id}', '${row.code}')">
                                ${deleteIcon}
                            </button>
                        `;
                    }
                }
            ],
        });

        tableRef.current = table;
        window.roomCRUD = window.roomCRUD || {};

        window.roomCRUD.edit = (id) => {
            setEditId(id);
            $('#roomOffcanvas').offcanvas('show');
        };

        window.roomCRUD.delete = (id, code) => {
            Swal.fire({
                title: 'Delete Room',
                text: `Are you sure you want to delete room "${code}"?`,
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
                        url: route('admin.core.rooms.delete', id),
                        type: 'DELETE',
                    })
                        .done((res) => {
                            toastr.success(res.message || 'Room deleted successfully.');
                            tableRef.current?.ajax.reload(null, false);
                            loadStats();
                        })
                        .fail((xhr) => {
                            const message = xhr.responseJSON?.message || 'Failed to delete room.';
                            toastr.error(message);
                        });
                }
            });
        };

        return () => {
            table.destroy();
            delete window.roomCRUD;
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
            <Head title="Utilities > Room" />

            <Base title="Utilities > Room">
                <div className="row mb-4">
                    <StatsCard
                        id="total"
                        title="Total Rooms"
                        Icon={LuDoorOpen}
                        iconSize="28"
                        bgColor="bg-primary"
                        className="col-md-6"
                    />

                    <StatsCard
                        id="buildings-covered"
                        title="Buildings Covered"
                        Icon={LuBuilding2}
                        iconSize="28"
                        bgColor="bg-success"
                        className="col-md-6"
                    />
                </div>

                <div className="card">
                    <div className="card-datatable text-nowrap">
                        <ScrollableTable id="room-table">
                            <th>Id</th>
                            <th>Code</th>
                            <th>Type</th>
                            <th>Building</th>
                            <th>Actions</th>
                        </ScrollableTable>
                    </div>
                </div>

                <CreateAndEditRoom
                    editId={editId}
                    branches={branches}
                    buildings={buildings}
                    onSuccess={handleSuccess}
                />
            </Base>
        </>
    );
}
