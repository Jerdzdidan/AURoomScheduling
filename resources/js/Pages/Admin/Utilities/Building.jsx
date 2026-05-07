import { Head, usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import Base from "@/Layouts/Base";
import StatsCard from "@/Components/Card/StatsCard";
import ScrollableTable from "@/Components/Table/ScrollableTable";
import CreateAndEditBuilding from "./Forms/CreateAndEditBuilding";
import FilterBuildingOffcanvas from "./Forms/FilterBuildingOffcanvas";
import { LuBuilding2, LuUniversity } from "react-icons/lu";
import { BiSolidEdit, BiSolidTrash } from "react-icons/bi";

export default function Building() {
    const { branches = [] } = usePage().props;
    const tableRef = useRef(null);
    const filtersRef = useRef({
        branch_id: "",
    });
    const [filters, setFilters] = useState({
        branch_id: "",
    });
    const [editId, setEditId] = useState(null);

    const loadStats = () => {
        $.get(route('admin.utilities.buildings.stats')).done((stats) => {
            $('#total').text(stats.total);
            $('#branches-covered').text(stats.branches_covered);
        });
    };

    useEffect(() => {
        loadStats();

        const heading = document.createElement("h5");
        heading.classList.add("card-title", "mb-0", "text-md-start", "text-center", "pb-md-0", "pb-6");
        heading.innerHTML = "Buildings";

        const table = window.$('#building-table').DataTable({
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
                                $("#filterBuildingOffcanvas").offcanvas("show");
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
                                $('#buildingOffcanvas').offcanvas('show');
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
                url: route('admin.utilities.buildings.data'),
                data: function (d) {
                    d.filter_branch_id = filtersRef.current.branch_id;
                },
            },
            columns: [
                { data: "id", visible: false },
                { data: "name", width: "30%" },
                { data: "code", width: "15%" },
                {
                    data: "branch_name",
                    width: "30%",
                    render: (data, type, row) => `
                        <div class="d-flex flex-column">
                            <span class="fw-medium">${data ?? '-'}</span>
                            <small class="text-muted">${row.branch_code ?? ''}</small>
                        </div>
                    `,
                },
                {
                    data: "rooms_count",
                    width: "10%",
                    render: (data) => `<span class="badge bg-label-primary">${data}</span>`,
                },
                {
                    data: null,
                    orderable: false,
                    width: "15%",
                    render: (data, type, row) => {
                        const editIcon = renderToString(<BiSolidEdit size={16} />);
                        const deleteIcon = renderToString(<BiSolidTrash size={16} />);

                        return `
                            <button class="btn btn-sm btn-outline-warning me-1" title="Edit building: ${row.name}" onclick="buildingCRUD.edit('${row.id}')">
                                ${editIcon}
                            </button>

                            <button class="btn btn-sm btn-outline-danger" title="Delete building: ${row.name}" onclick="buildingCRUD.delete('${row.id}', '${row.name}')">
                                ${deleteIcon}
                            </button>
                        `;
                    }
                }
            ],
        });

        tableRef.current = table;
        window.buildingCRUD = window.buildingCRUD || {};

        window.buildingCRUD.edit = (id) => {
            setEditId(id);
            $('#buildingOffcanvas').offcanvas('show');
        };

        window.buildingCRUD.delete = (id, name) => {
            Swal.fire({
                title: 'Delete Building',
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
                        url: route('admin.utilities.buildings.delete', id),
                        type: 'DELETE',
                    })
                        .done((res) => {
                            toastr.success(res.message || 'Building deleted successfully.');
                            tableRef.current?.ajax.reload(null, false);
                            loadStats();
                        })
                        .fail((xhr) => {
                            const message = xhr.responseJSON?.message || 'Failed to delete building.';
                            toastr.error(message);
                        });
                }
            });
        };

        const $offcanvas = $('#buildingOffcanvas');
        $offcanvas.on('hidden.bs.offcanvas', () => {
            setEditId(null);
        });

        return () => {
            $offcanvas.off('hidden.bs.offcanvas');
            table.destroy();
            delete window.buildingCRUD;
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
            <Head title="Utilities > Building" />

            <Base title="Utilities > Building">
                <div className="row mb-4">
                    <StatsCard
                        id="total"
                        title="Total Buildings"
                        Icon={LuBuilding2}
                        iconSize="28"
                        bgColor="bg-primary"
                        className="col-md-6"
                    />

                    <StatsCard
                        id="branches-covered"
                        title="Branches Covered"
                        Icon={LuUniversity}
                        iconSize="28"
                        bgColor="bg-success"
                        className="col-md-6"
                    />
                </div>

                <div className="card">
                    <div className="card-datatable text-nowrap">
                        <ScrollableTable id="building-table">
                            <th>Id</th>
                            <th>Name</th>
                            <th>Code</th>
                            <th>Branch</th>
                            <th>Rooms</th>
                            <th>Actions</th>
                        </ScrollableTable>
                    </div>
                </div>

                <CreateAndEditBuilding editId={editId} branches={branches} onSuccess={handleSuccess} />

                <FilterBuildingOffcanvas
                    filters={filters}
                    setFilters={setFilters}
                    branches={branches}
                    onApply={applyFilters}
                />
            </Base>
        </>
    );
}
