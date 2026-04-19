import { Head } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import Base from "@/Layouts/Base";
import StatsCard from "@/Components/Card/StatsCard";
import ScrollableTable from "@/Components/Table/ScrollableTable";
import CreateAndEditAcademicPeriod from "./Forms/CreateAndEditAcademicPeriod";
import { LuCalendarDays, LuSchool } from "react-icons/lu";
import { BiSolidEdit, BiSolidStar, BiStar, BiSolidTrash } from "react-icons/bi";

const semesterLabels = {
    '1ST': '1st Semester',
    '2ND': '2nd Semester',
    'SUMMER': 'Summer',
};

const getSemesterLabel = (semester) => semesterLabels[semester] ?? semester;

const getAcademicPeriodLabel = (row) => `A.Y. ${row.academic_year} - ${getSemesterLabel(row.semester)}`;

export default function AcademicPeriod() {
    const tableRef = useRef(null);
    const [editId, setEditId] = useState(null);

    const loadStats = () => {
        $.get(route('admin.utilities.academic-periods.stats')).done((stats) => {
            $('#total').text(stats.total);
            $('#current').text(stats.current ?? 'None');
        });
    };

    useEffect(() => {
        loadStats();

        const heading = document.createElement("h5");
        heading.classList.add("card-title", "mb-0", "text-md-start", "text-center", "pb-md-0", "pb-6");
        heading.innerHTML = "Academic Periods";

        const table = window.$('#academic-period-table').DataTable({
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
                                $('#academicPeriodOffcanvas').offcanvas('show');
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
            ajax: route('admin.utilities.academic-periods.data'),
            columns: [
                { data: "id", visible: false },
                {
                    data: "academic_year",
                    width: "26%",
                    render: (data) => `A.Y. ${data}`,
                },
                {
                    data: "semester",
                    width: "24%",
                    render: (data) => getSemesterLabel(data),
                },
                {
                    data: "is_current",
                    width: "18%",
                    render: (data) => {
                        const badge = data ? 'success' : 'secondary';
                        const label = data ? 'Current' : 'Not Current';

                        return `<span class="badge bg-label-${badge}">${label}</span>`;
                    }
                },
                {
                    data: null,
                    orderable: false,
                    width: "32%",
                    render: (data, type, row) => {
                        const setCurrentIcon = row.is_current
                            ? renderToString(<BiSolidStar size={16} />)
                            : renderToString(<BiStar size={16} />);
                        const editIcon = renderToString(<BiSolidEdit size={16} />);
                        const deleteIcon = renderToString(<BiSolidTrash size={16} />);
                        const currentButtonClass = row.is_current ? 'btn-outline-secondary disabled' : 'btn-outline-primary';
                        const currentButtonAction = row.is_current
                            ? ''
                            : `onclick="academicPeriodCRUD.setCurrent('${row.id}', '${getAcademicPeriodLabel(row)}')"`;

                        return `
                            <button class="btn btn-sm ${currentButtonClass}" title="${row.is_current ? 'Already current' : 'Set as current academic period'}" ${row.is_current ? 'disabled' : ''} ${currentButtonAction}>
                                ${setCurrentIcon}
                            </button>

                            <button class="btn btn-sm btn-outline-warning mx-1" title="Edit ${getAcademicPeriodLabel(row)}" onclick="academicPeriodCRUD.edit('${row.id}')">
                                ${editIcon}
                            </button>

                            <button class="btn btn-sm btn-outline-danger" title="Delete ${getAcademicPeriodLabel(row)}" onclick="academicPeriodCRUD.delete('${row.id}', '${getAcademicPeriodLabel(row)}')">
                                ${deleteIcon}
                            </button>
                        `;
                    }
                }
            ],
        });

        tableRef.current = table;
        window.academicPeriodCRUD = window.academicPeriodCRUD || {};

        window.academicPeriodCRUD.edit = (id) => {
            setEditId(id);
            $('#academicPeriodOffcanvas').offcanvas('show');
        };

        window.academicPeriodCRUD.setCurrent = (id, label) => {
            Swal.fire({
                title: 'Set Current Academic Period',
                text: `Are you sure you want to make "${label}" the current academic period?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, set it',
                cancelButtonText: 'Cancel',
                customClass: {
                    confirmButton: 'btn btn-primary me-3',
                    cancelButton: 'btn btn-label-secondary',
                },
                buttonsStyling: false,
            }).then((result) => {
                if (result.isConfirmed) {
                    $.post(route('admin.utilities.academic-periods.set-current', id))
                        .done((res) => {
                            toastr.success(res.message || 'Academic period updated successfully.');
                            tableRef.current?.ajax.reload(null, false);
                            loadStats();
                        })
                        .fail(() => {
                            toastr.error('Failed to set current academic period.');
                        });
                }
            });
        };

        window.academicPeriodCRUD.delete = (id, label) => {
            Swal.fire({
                title: 'Delete Academic Period',
                text: `Are you sure you want to delete "${label}"? This action cannot be undone.`,
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
                        url: route('admin.utilities.academic-periods.delete', id),
                        type: 'DELETE',
                    })
                        .done((res) => {
                            toastr.success(res.message || 'Academic period deleted successfully.');
                            tableRef.current?.ajax.reload(null, false);
                            loadStats();
                        })
                        .fail(() => {
                            toastr.error('Failed to delete academic period.');
                        });
                }
            });
        };

        return () => {
            table.destroy();
            delete window.academicPeriodCRUD;
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
            <Head title="Utilities > Academic Period" />

            <Base title="Utilities > Academic Period">
                <div className="row mb-4">
                    <StatsCard
                        id="total"
                        title="Total Academic Periods"
                        Icon={LuCalendarDays}
                        iconSize="28"
                        bgColor="bg-primary"
                        className="col-md-6"
                    />

                    <StatsCard
                        id="current"
                        title="Current Academic Period"
                        Icon={LuSchool}
                        iconSize="28"
                        bgColor="bg-success"
                        className="col-md-6"
                    />
                </div>

                <div className="card">
                    <div className="card-datatable text-nowrap">
                        <ScrollableTable id="academic-period-table">
                            <th>Id</th>
                            <th>Academic Year</th>
                            <th>Semester</th>
                            <th>Current</th>
                            <th>Actions</th>
                        </ScrollableTable>
                    </div>
                </div>

                <CreateAndEditAcademicPeriod editId={editId} onSuccess={handleSuccess} />
            </Base>
        </>
    );
}
