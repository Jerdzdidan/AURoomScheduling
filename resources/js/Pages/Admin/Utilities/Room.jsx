import { Head, usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import Base from "@/Layouts/Base";
import StatsCard from "@/Components/Card/StatsCard";
import ScrollableTable from "@/Components/Table/ScrollableTable";
import CreateAndEditRoom from "./Forms/CreateAndEditRoom";
import FilterRoomOffcanvas from "./Forms/FilterRoomOffcanvas";
import { LuDoorOpen, LuBuilding2 } from "react-icons/lu";
import { BiSolidEdit, BiSolidTrash } from "react-icons/bi";

export default function Room() {
    const { branches = [], departments = [], buildings = [] } = usePage().props;
    const tableRef = useRef(null);
    const filtersRef = useRef({
        branch_id: "",
        building_id: "",
        room_type: "",
        department_id: "",
    });
    const [filters, setFilters] = useState({
        branch_id: "",
        building_id: "",
        room_type: "",
        department_id: "",
    });
    const [editId, setEditId] = useState(null);

    const loadStats = () => {
        $.get(route('admin.utilities.rooms.stats')).done((stats) => {
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
                            text: '<span class="d-flex align-items-center gap-2"><i class="icon-base bx bx-filter-alt icon-sm"></i></span>',
                            className: "btn btn-info me-4",
                            action: function () {
                                $("#filterRoomOffcanvas").offcanvas("show");
                            },
                        }, {
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
            initComplete: function () {
                $(".dt-buttons").removeClass("btn-group");
            },
            ajax: {
                url: route("admin.utilities.rooms.data"),
                data: function (d) {
                    d.filter_branch_id = filtersRef.current.branch_id;
                    d.filter_building_id = filtersRef.current.building_id;
                    d.filter_room_type = filtersRef.current.room_type;
                    d.filter_department_id = filtersRef.current.department_id;
                },
            },
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
                    width: "28%",
                    render: (data, type, row) => `
                        <div class="d-flex flex-column">
                            <span class="fw-medium">${data ?? '-'}</span>
                            <small class="text-muted">${row.building_code ?? ''}</small>
                            <small class="text-muted">${row.branch_code ?? ''}${row.branch_name ? ` - ${row.branch_name}` : ''}</small>
                        </div>
                    `,
                },
                {
                    data: "department_assignments",
                    width: "22%",
                    render: (data) => {
                        if (!Array.isArray(data) || data.length === 0) {
                            return '<span class="text-muted">No departments assigned</span>';
                        }

                        const badges = data
                            .map((department) => `<span class="badge bg-label-info" title="${department.name}">${department.code}</span>`)
                            .join(' ');

                        return `
                            <div class="d-flex flex-column gap-1">
                                <div class="d-flex flex-wrap gap-1">${badges}</div>
                                <small class="text-muted">${data.length} department(s)</small>
                            </div>
                        `;
                    }
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
                        url: route('admin.utilities.rooms.delete', id),
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

        const $offcanvas = $('#roomOffcanvas');
        $offcanvas.on('hidden.bs.offcanvas', () => {
            setEditId(null);
        });

        return () => {
            $offcanvas.off('hidden.bs.offcanvas');
            table.destroy();
            delete window.roomCRUD;
        };
    }, []);

    const applyFilters = (overrideFilters) => {
        filtersRef.current = { ...(overrideFilters ?? filters) };
        if (tableRef.current) {
            tableRef.current.ajax.reload(null, true);
        }
    };

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
                            <th>Departments</th>
                            <th>Actions</th>
                        </ScrollableTable>
                    </div>
                </div>

                <CreateAndEditRoom
                    editId={editId}
                    branches={branches}
                    departments={departments}
                    buildings={buildings}
                    onSuccess={handleSuccess}
                />

                <FilterRoomOffcanvas
                    filters={filters}
                    setFilters={setFilters}
                    branches={branches}
                    buildings={buildings}
                    departments={departments}
                    onApply={applyFilters}
                />
            </Base>
        </>
    );
}
