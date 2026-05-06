import {
    Combobox,
    ComboboxButton,
    ComboboxInput,
    ComboboxOption,
    ComboboxOptions,
} from "@headlessui/react";
import { useMemo, useState } from "react";

const toMinutes = (value) => {
    const [hours = "0", minutes = "0"] = value.split(":");
    return Number(hours) * 60 + Number(minutes);
};

const formatTimeLabel = (value) => {
    const [hours, minutes] = value.split(":").map(Number);
    const suffix = hours >= 12 ? "PM" : "AM";
    const normalizedHours = hours % 12 || 12;

    return `${normalizedHours}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

const getTimeOptions = (minTime, maxTime, stepMinutes) => {
    const start = toMinutes(minTime);
    const end = toMinutes(maxTime);
    const options = [];

    for (let current = start; current <= end; current += stepMinutes) {
        const hours = String(Math.floor(current / 60)).padStart(2, "0");
        const minutes = String(current % 60).padStart(2, "0");
        const value = `${hours}:${minutes}`;

        options.push({
            value,
            label: formatTimeLabel(value),
            search: `${value} ${formatTimeLabel(value)}`.toLowerCase().replace(/\s+/g, ""),
        });
    }

    return options;
};

export default function TimeSelectField({
    id,
    label,
    name,
    value,
    onChange,
    error,
    help,
    placeholder = "hh:mm",
    minTime = "07:30",
    maxTime = "20:30",
    stepMinutes = 5,
    required = false,
}) {
    const [query, setQuery] = useState("");

    const options = useMemo(
        () => getTimeOptions(minTime, maxTime, stepMinutes),
        [minTime, maxTime, stepMinutes],
    );

    const selectedOption = useMemo(
        () => options.find((option) => option.value === value) ?? null,
        [options, value],
    );

    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.toLowerCase().replace(/\s+/g, "");

        if (!normalizedQuery) {
            return options;
        }

        return options.filter((option) =>
            option.search.includes(normalizedQuery)
        );
    }, [options, query]);

    return (
        <div className="mb-3">
            {label && (
                <label className="form-label" htmlFor={id}>
                    {label}
                    {required && <span className="text-danger"> *</span>}
                </label>
            )}

            <Combobox
                value={selectedOption}
                onChange={(option) => {
                    onChange(option?.value ?? "");
                    setQuery("");
                }}
                nullable
            >
                <div className="position-relative">
                    <div
                        className="input-group mb-2"
                        style={error ? { border: "1px solid #fc4225", borderRadius: "0.375rem" } : {}}
                    >

                        <ComboboxInput
                            id={id}
                            name={name}
                            className="form-control"
                            autoComplete="off"
                            placeholder={placeholder}
                            displayValue={(option) => option?.label ?? ""}
                            onChange={(event) => setQuery(event.target.value)}
                            onBlur={() => setQuery("")}
                            style={error ? { border: "none" } : {}}
                        />

                        <ComboboxButton
                            className="btn btn-outline-secondary bg-white border"
                            style={error ? { border: "none" } : {}}
                        >
                            <i className="bx bx-chevron-down"></i>
                        </ComboboxButton>
                    </div>

                    <ComboboxOptions
                        className="position-absolute start-0 z-3 mt-1 w-100 overflow-auto rounded-3 border bg-white shadow-sm py-2"
                        style={{ maxHeight: "280px" }}
                    >
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-muted small">
                                No matching time found.
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <ComboboxOption
                                    key={option.value}
                                    value={option}
                                    className={({ focus, selected }) =>
                                        `px-3 py-2 ${focus ? "bg-primary-subtle" : ""} ${selected ? "text-primary fw-semibold" : "text-body"}`
                                    }
                                >
                                    {({ selected }) => (
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span>{option.label}</span>
                                            {selected && <i className="bx bx-check fs-5"></i>}
                                        </div>
                                    )}
                                </ComboboxOption>
                            ))
                        )}
                    </ComboboxOptions>
                </div>
            </Combobox>

            {error && <div className="invalid-feedback d-block">{error}</div>}
            {help && !error && <div className="form-text">{help}</div>}
        </div>
    );
}
