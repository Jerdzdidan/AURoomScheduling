import { useForm } from "@inertiajs/react";
import { useEffect } from "react";
import OffcanvasForm from "@/Components/Form/OffcanvasForm";
import InputField from "@/Components/Input/InputField";
import SelectField from "@/Components/Input/SelectField";

const getInitialValues = () => ({
    name: "",
    email: "",
    user_type: "",
    department_id: "",
    password: "",
    password_confirmation: "",
});

const userTypeOptions = [
    { id: "ADMIN", name: "ADMIN" },
    { id: "OFFICER", name: "OFFICER" },
];

export default function CreateAndEditUser({ editId, departments = [], onSuccess }) {
    const isEditing = !!editId;
    const { data, setData, post, put, processing, errors, clearErrors, reset, setError } = useForm(getInitialValues());

    useEffect(() => {
        if (!editId) {
            reset();
            clearErrors();
            return;
        }

        $.get(route("admin.users.show", editId))
            .done((user) => {
                setData({
                    name: user.name ?? "",
                    email: user.email ?? "",
                    user_type: user.user_type ?? "",
                    department_id: user.department_id?.toString() ?? "",
                    password: "",
                    password_confirmation: "",
                });
                clearErrors();
            })
            .fail(() => {
                toastr.error("Failed to load user details.");
            });
    }, [editId]);

    useEffect(() => {
        const $offcanvas = $("#userOffcanvas");

        $offcanvas.on("hidden.bs.offcanvas", () => {
            reset();
            clearErrors();
        });

        return () => $offcanvas.off("hidden.bs.offcanvas");
    }, []);

    const handleUserTypeChange = (value) => {
        clearErrors("department_id");

        setData((current) => ({
            ...current,
            user_type: value,
            department_id: value === "OFFICER" ? current.department_id : "",
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (data.user_type === "OFFICER" && !data.department_id) {
            setError("department_id", "Department is required for officer accounts.");
            toastr.error("Select a department for officer accounts.");
            return;
        }

        const options = {
            onSuccess: () => {
                reset();
                $("#userOffcanvas").offcanvas("hide");
                toastr.success(
                    isEditing
                        ? "User updated successfully."
                        : "User created successfully."
                );

                if (onSuccess) {
                    onSuccess();
                }
            },
        };

        if (isEditing) {
            put(route("admin.users.update", editId), options);
            return;
        }

        post(route("admin.users.store"), options);
    };

    const departmentDisabled = data.user_type !== "OFFICER";

    return (
        <OffcanvasForm
            id="userOffcanvas"
            title={isEditing ? "Edit User" : "Add New User"}
            formId="user-form"
            onSubmit={handleSubmit}
            submitButtonName={processing ? "Saving..." : (isEditing ? "Update" : "Submit")}
        >
            <InputField
                id="user-name"
                label="Full Name"
                name="name"
                icon="bx bx-user"
                placeholder="John Doe"
                value={data.name}
                onChange={(event) => setData("name", event.target.value)}
                error={errors.name}
            />

            <InputField
                id="user-email"
                label="Email"
                name="email"
                type="email"
                icon="bx bx-envelope"
                placeholder="john.doe@example.com"
                value={data.email}
                onChange={(event) => setData("email", event.target.value)}
                error={errors.email}
            />

            <SelectField
                id="user-type"
                label="User Type"
                name="user_type"
                placeholder="Select a user type"
                value={data.user_type}
                onChange={handleUserTypeChange}
                options={userTypeOptions}
                dropdownParent="#userOffcanvas"
                error={errors.user_type}
            />

            <SelectField
                id="user-department"
                label="Department"
                name="department_id"
                placeholder={departmentDisabled ? "Available only for officers" : "Select a department"}
                value={data.department_id}
                onChange={(value) => {
                    setData("department_id", value);
                    clearErrors("department_id");
                }}
                options={departments}
                renderOption={(department) => `${department.branch_code} - ${department.code} - ${department.name}`}
                dropdownParent="#userOffcanvas"
                error={errors.department_id}
                disabled={departmentDisabled}
                required={!departmentDisabled}
            />

            {departmentDisabled && (
                <div className="form-text mb-3">
                    Department assignment is only required for officer accounts.
                </div>
            )}

            <InputField
                id="user-password"
                label={isEditing ? "New Password (leave blank to keep current)" : "Password"}
                name="password"
                type="password"
                icon="bx bx-lock-alt"
                placeholder="••••••••"
                value={data.password}
                onChange={(event) => setData("password", event.target.value)}
                error={errors.password}
            />

            <InputField
                id="user-password-confirmation"
                label="Confirm Password"
                name="password_confirmation"
                type="password"
                icon="bx bx-lock-alt"
                placeholder="••••••••"
                value={data.password_confirmation}
                onChange={(event) => setData("password_confirmation", event.target.value)}
                error={errors.password}
            />
        </OffcanvasForm>
    );
}
