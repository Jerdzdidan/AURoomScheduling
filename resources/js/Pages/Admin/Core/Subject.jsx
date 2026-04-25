import { Head, usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import Base from "@/Layouts/Base";
import StatsCard from "@/Components/Card/StatsCard";
import ScrollableTable from "@/Components/Table/ScrollableTable";
import CreateAndEditSubject from "./Forms/CreateAndEditSubject";
import ImportSubjectModal from "./Forms/ImportSubjectModal";
import FilterSubjectOffcanvas from "./Forms/FilterSubjectOffcanvas";
import { LuBookText, LuGraduationCap } from "react-icons/lu";
import { BiSolidEdit, BiSolidTrash } from "react-icons/bi";

export default function Subject() {
    const { branches = [], departments = [], programs = [], subjectTypeOptions = [], classTypeOptions = [] } = usePage().props;
    const tableRef = useRef(null);
    const filtersRef = useRef({
        branch_id: '',
        department_id: '',
        program_id: '',
        subject_type: '',
        class_type: '',
    });
    const [editId, setEditId] = useState(null);
    const [filters, setFilters] = useState({
        branch_id: '',
        department_id: '',
        program_id: '',
        subject_type: '',
        class_type: '',
    });

    const loadStats = () => {
        $.get(route('admin.core.subjects.stats')).done((stats) => {
            $('#total').text(stats.total);
            $('#programs-covered').text(stats.programs_covered);
        });
    };

    useEffect(() => {
        loadStats();

        const heading = document.createElement("h5");
        heading.classList.add("card-title", "mb-0", "text-md-start", "text-center", "pb-md-0", "pb-6");
        heading.innerHTML = "Subjects";

        const table = window.$('#subject-table').DataTable({
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
                                $('#filterSubjectOffcanvas').offcanvas('show');
                            }
                        }, {
                            extend: "collection",
                            className: "btn btn-label-primary dropdown-toggle me-4",
                            text: '<span class="d-flex align-items-center gap-2"><i class="icon-base bx bx-export me-sm-1"></i> <span class="d-none d-sm-inline-block">Export</span></span>',
                            buttons: [{
                                extend: "csv",
                                text: '<span class="d-flex align-items-center"><i class="icon-base bx bx-file me-1"></i>Csv</span>',
                                className: "dropdown-item",
                                exportOptions: {
                                    columns: [1, 2, 3, 4, 5],
                                }
                            }]
                        }, {
                            text: '<span class="d-flex align-items-center gap-2"><i class="icon-base bx bx-import icon-sm"></i> <span class="d-none d-sm-inline-block">Import</span></span>',
                            className: "btn btn-label-success me-4",
                            action: function () {
                                $('#importSubjectModal').modal('show');
                            }
                        }, {
                            text: '<span class="d-flex align-items-center gap-2"><i class="icon-base bx bx-plus icon-sm"></i> <span class="d-none d-sm-inline-block">Add New Record</span></span>',
                            className: "create-new btn btn-primary",
                            action: function () {
                                setEditId(null);
                                $('#subjectOffcanvas').offcanvas('show');
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
                $('.dt-buttons').removeClass('btn-group');
            },
            ajax: {
                url: route('admin.core.subjects.data'),
                data: function (d) {
                    d.filter_branch_id = filtersRef.current.branch_id;
                    d.filter_department_id = filtersRef.current.department_id;
                    d.filter_program_id = filtersRef.current.program_id;
                    d.filter_subject_type = filtersRef.current.subject_type;
                    d.filter_class_type = filtersRef.current.class_type;
                },
            },
            columns: [
                { data: "id", visible: false },
                { data: "name", width: "30%" },
                { data: "code", width: "20%" },
                {
                    data: "program_name",
                    width: "25%",
                    render: (data, type, row) => `
                        <div class="d-flex flex-column">
                            <span class="fw-medium">${data ?? '-'}</span>
                            <small class="text-muted">${row.program_code ?? ''}</small>
                            <small class="text-muted">${row.department_code ?? ''}${row.department_name ? ` - ${row.department_name}` : ''}</small>
                            <small class="text-muted">${row.branch_code ?? ''}${row.branch_name ? ` - ${row.branch_name}` : ''}</small>
                        </div>
                    `,
                },
                {
                    data: "subject_type",
                    width: "10%",
                    render: (data) => {
                        if (!data) return '-';
                        const badge = data === 'MAJOR' ? 'bg-label-primary' : 'bg-label-info';
                        const label = data === 'MAJOR' ? 'Major' : 'Minor';
                        return `<span class="badge ${badge}">${label}</span>`;
                    },
                },
                {
                    data: "class_type",
                    width: "10%",
                    render: (data) => {
                        if (!data) return '-';
                        const badge = data === 'LEC' ? 'bg-label-warning' : 'bg-label-success';
                        return `<span class="badge ${badge}">${data}</span>`;
                    },
                },
                {
                    data: null,
                    orderable: false,
                    width: "15%",
                    render: (data, type, row) => {
                        const editIcon = renderToString(<BiSolidEdit size={16} />);
                        const deleteIcon = renderToString(<BiSolidTrash size={16} />);

                        return `
                            <button class="btn btn-sm btn-outline-warning me-1" title="Edit subject: ${row.code}" onclick="subjectCRUD.edit('${row.id}')">
                                ${editIcon}
                            </button>

                            <button class="btn btn-sm btn-outline-danger" title="Delete subject: ${row.code}" onclick="subjectCRUD.delete('${row.id}', '${row.code}')">
                                ${deleteIcon}
                            </button>
                        `;
                    }
                }
            ],
        });

        tableRef.current = table;
        window.subjectCRUD = window.subjectCRUD || {};

        window.subjectCRUD.edit = (id) => {
            setEditId(id);
            $('#subjectOffcanvas').offcanvas('show');
        };

        window.subjectCRUD.delete = (id, code) => {
            Swal.fire({
                title: 'Delete Subject',
                text: `Are you sure you want to delete subject "${code}"?`,
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
                        url: route('admin.core.subjects.delete', id),
                        type: 'DELETE',
                    })
                        .done((res) => {
                            toastr.success(res.message || 'Subject deleted successfully.');
                            tableRef.current?.ajax.reload(null, false);
                            loadStats();
                        })
                        .fail((xhr) => {
                            const message = xhr.responseJSON?.message || 'Failed to delete subject.';
                            toastr.error(message);
                        });
                }
            });
        };

        const $offcanvas = $('#subjectOffcanvas');
        $offcanvas.on('hidden.bs.offcanvas', () => {
            setEditId(null);
        });

        return () => {
            $offcanvas.off('hidden.bs.offcanvas');
            table.destroy();
            delete window.subjectCRUD;
        };
    }, []);

    const handleSuccess = () => {
        setEditId(null);

        if (tableRef.current) {
            tableRef.current.ajax.reload(null, false);
        }

        loadStats();
    };

    const applyFilters = (overrideFilters) => {
        filtersRef.current = { ...(overrideFilters ?? filters) };
        if (tableRef.current) {
            tableRef.current.ajax.reload(null, true);
        }
    };

    return (
        <>
            <Head title="Core > Subject" />

            <Base title="Core > Subject">
                <div className="row mb-4">
                    <StatsCard
                        id="total"
                        title="Total Subjects"
                        Icon={LuBookText}
                        iconSize="28"
                        bgColor="bg-primary"
                        className="col-md-6"
                    />

                    <StatsCard
                        id="programs-covered"
                        title="Programs Covered"
                        Icon={LuGraduationCap}
                        iconSize="28"
                        bgColor="bg-success"
                        className="col-md-6"
                    />
                </div>

                <div className="card">
                    <div className="card-datatable text-nowrap">
                        <ScrollableTable id="subject-table">
                            <th>Id</th>
                            <th>Name</th>
                            <th>Code</th>
                            <th>Program</th>
                            <th>Subject Type</th>
                            <th>Class Type</th>
                            <th>Actions</th>
                        </ScrollableTable>
                    </div>
                </div>

                <CreateAndEditSubject
                    editId={editId}
                    branches={branches}
                    departments={departments}
                    programs={programs}
                    subjectTypeOptions={subjectTypeOptions}
                    classTypeOptions={classTypeOptions}
                    onSuccess={handleSuccess}
                />

                <ImportSubjectModal onSuccess={handleSuccess} />

                <FilterSubjectOffcanvas
                    filters={filters}
                    setFilters={setFilters}
                    branches={branches}
                    departments={departments}
                    programs={programs}
                    subjectTypeOptions={subjectTypeOptions}
                    classTypeOptions={classTypeOptions}
                    onApply={applyFilters}
                />
            </Base>
        </>
    );
}
