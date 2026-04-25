import { Head, usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { BiSolidEdit, BiSolidToggleRight, BiSolidTrash, BiToggleLeft } from "react-icons/bi";
import { LuUserRoundCheck, LuUserRoundX, LuUsersRound } from "react-icons/lu";
import StatsCard from "@/Components/Card/StatsCard";
import ScrollableTable from "@/Components/Table/ScrollableTable";
import Base from "@/Layouts/Base";
import CreateAndEditUser from "./Forms/CreateAndEditUser";

export default function Users() {
    const { departments = [] } = usePage().props;
    const tableRef = useRef(null);
    const [editId, setEditId] = useState(null);

    const loadStats = () => {
        $.get(route("admin.users.stats")).done((stats) => {
            $("#total").text(stats.total);
            $("#active").text(stats.active);
            $("#inactive").text(stats.inactive);
        });
    };

    useEffect(() => {
        loadStats();

        const heading = document.createElement("h5");
        heading.classList.add("card-title", "mb-0", "text-md-start", "text-center", "pb-md-0", "pb-6");
        heading.innerHTML = "Users";

        const table = window.$("#users-table").DataTable({
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
                            text: "Show_MENU_entries",
                        },
                    }],
                },
                top2Start: {
                    rowClass: "row card-header flex-column flex-md-row pb-0",
                    features: [heading],
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
                                    columns: [1, 2, 3, 4, 5],
                                    format: {
                                        body: function (content) {
                                            if (content.length <= 0) {
                                                return content;
                                            }

                                            const parsed = new DOMParser().parseFromString(content, "text/html");
                                            return (parsed.body.textContent || parsed.body.innerText || "").trim();
                                        },
                                    },
                                },
                            }],
                        }, {
                            text: '<span class="d-flex align-items-center gap-2"><i class="icon-base bx bx-plus icon-sm"></i> <span class="d-none d-sm-inline-block">Add New Record</span></span>',
                            className: "create-new btn btn-primary",
                            action: function () {
                                setEditId(null);
                                $("#userOffcanvas").offcanvas("show");
                            },
                        }],
                    }],
                },
                topEnd: {
                    search: {
                        placeholder: "",
                    },
                },
                bottomStart: {
                    rowClass: "row mx-3 justify-content-between",
                    features: ["info"],
                },
                bottomEnd: {
                    paging: {
                        firstLast: false,
                    },
                },
            },
            language: {
                paginate: {
                    next: '<i class="icon-base bx bx-chevron-right scaleX-n1-rtl icon-sm"></i>',
                    previous: '<i class="icon-base bx bx-chevron-left scaleX-n1-rtl icon-sm"></i>',
                },
            },
            autoWidth: false,
            ajax: route("admin.users.data"),
            columns: [
                { data: "id", visible: false },
                { data: "name", width: "20%" },
                { data: "email", width: "22%" },
                {
                    data: "user_type",
                    width: "12%",
                    render: (data) => {
                        const badge = data === "ADMIN" ? "primary" : "info";
                        return `<span class="badge bg-label-${badge}">${data}</span>`;
                    },
                },
                {
                    data: "department_name",
                    orderable: false,
                    width: "20%",
                    render: (data, type, row) => {
                        if (row.user_type === "ADMIN") {
                            return '<span class="text-muted">---</span>';
                        }

                        if (!data || data === "-") {
                            return '<span class="text-muted">Unassigned</span>';
                        }

                        return `
                            <div class="d-flex flex-column">
                                <span class="fw-medium">${data}</span>
                                <small class="text-muted mt-1">${row.department_code ?? ""}</small>
                                <small class="text-muted">${row.branch_code ?? ""}${row.branch_name ? ` - ${row.branch_name}` : ""}</small>
                            </div>
                        `;
                    },
                },
                {
                    data: "status",
                    width: "14%",
                    render: (data, type, row) => {
                        const status = row.status ? "Active" : "Inactive";
                        const badge = row.status ? "success" : "danger";
                        return `<span class="badge bg-label-${badge}">${status}</span>`;
                    },
                },
                {
                    data: null,
                    orderable: false,
                    width: "12%",
                    render: (data, type, row) => {
                        const toggleIcon = row.status
                            ? renderToString(<BiSolidToggleRight size={16} />)
                            : renderToString(<BiToggleLeft size={16} />);
                        const editIcon = renderToString(<BiSolidEdit size={16} />);
                        const deleteIcon = renderToString(<BiSolidTrash size={16} />);

                        return `
                            <button class="btn btn-sm btn-outline-primary" title="Toggle user status" onclick="userCRUD.toggleStatus('${row.id}', '${row.name}')">
                                ${toggleIcon}
                            </button>

                            <button class="btn btn-sm btn-outline-warning mx-1" title="Edit user: ${row.name}" onclick="userCRUD.edit('${row.id}')">
                                ${editIcon}
                            </button>

                            <button class="btn btn-sm btn-outline-danger" title="Delete user: ${row.name}" onclick="userCRUD.delete('${row.id}', '${row.name}')">
                                ${deleteIcon}
                            </button>
                        `;
                    },
                },
            ],
        });

        tableRef.current = table;
        window.userCRUD = window.userCRUD || {};
        const $offcanvas = $("#userOffcanvas");

        window.userCRUD.edit = (id) => {
            setEditId(id);
            $("#userOffcanvas").offcanvas("show");
        };

        window.userCRUD.toggleStatus = (id, name) => {
            Swal.fire({
                title: "Toggle Status",
                text: `Are you sure you want to toggle the status of "${name}"?`,
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Yes, toggle it",
                cancelButtonText: "Cancel",
                customClass: {
                    confirmButton: "btn btn-primary me-3",
                    cancelButton: "btn btn-label-secondary",
                },
                buttonsStyling: false,
            }).then((result) => {
                if (result.isConfirmed) {
                    $.post(route("admin.users.toggle", id))
                        .done((response) => {
                            toastr.success(response.message || "Status toggled successfully.");
                            tableRef.current?.ajax.reload(null, false);
                            loadStats();
                        })
                        .fail((xhr) => {
                            toastr.error(xhr.responseJSON?.message || "Failed to toggle status.");
                        });
                }
            });
        };

        window.userCRUD.delete = (id, name) => {
            Swal.fire({
                title: "Delete User",
                text: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes, delete",
                cancelButtonText: "Cancel",
                customClass: {
                    confirmButton: "btn btn-danger me-3",
                    cancelButton: "btn btn-label-secondary",
                },
                buttonsStyling: false,
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: route("admin.users.delete", id),
                        type: "DELETE",
                    })
                        .done((response) => {
                            toastr.success(response.message || "User deleted successfully.");
                            tableRef.current?.ajax.reload(null, false);
                            loadStats();
                        })
                        .fail((xhr) => {
                            toastr.error(xhr.responseJSON?.message || "Failed to delete user.");
                        });
                }
            });
        };

        $offcanvas.on("hidden.bs.offcanvas", () => {
            setEditId(null);
        });

        return () => {
            table.destroy();
            $offcanvas.off("hidden.bs.offcanvas");
            delete window.userCRUD;
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
            <Head title="User Management > Users" />

            <Base title="User Management > Users">
                <div className="row mb-4">
                    <StatsCard
                        id="total"
                        title="Total Users"
                        Icon={LuUsersRound}
                        iconSize="28"
                        bgColor="bg-primary"
                        className="col-md-4"
                    />

                    <StatsCard
                        id="active"
                        title="Active Users"
                        Icon={LuUserRoundCheck}
                        iconSize="28"
                        bgColor="bg-success"
                        className="col-md-4"
                    />

                    <StatsCard
                        id="inactive"
                        title="Inactive Users"
                        Icon={LuUserRoundX}
                        iconSize="28"
                        bgColor="bg-danger"
                        className="col-md-4"
                    />
                </div>

                <div className="card">
                    <div className="card-datatable text-nowrap">
                        <ScrollableTable id="users-table">
                            <th>Id</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>User Type</th>
                            <th>Department</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </ScrollableTable>
                    </div>
                </div>

                <CreateAndEditUser
                    editId={editId}
                    departments={departments}
                    onSuccess={handleSuccess}
                />
            </Base>
        </>
    );
}
