const DAY_MAP = [
    { key: "MONDAY", label: "M" },
    { key: "TUESDAY", label: "T" },
    { key: "WEDNESDAY", label: "W" },
    { key: "THURSDAY", label: "T" },
    { key: "FRIDAY", label: "F" },
    { key: "SATURDAY", label: "S" },
    { key: "SUNDAY", label: "S" },
];

export default function DayRecurrenceSelector({
    selectedDays = [],
    onChange,
    lockedDay = null,
}) {
    const toggle = (dayKey) => {
        // Cannot uncheck the locked (primary) day
        if (dayKey === lockedDay) return;

        const isSelected = selectedDays.includes(dayKey);

        if (isSelected) {
            onChange(selectedDays.filter((d) => d !== dayKey));
        } else {
            onChange([...selectedDays, dayKey]);
        }
    };

    return (
        <div className="day-recurrence-selector">
            {DAY_MAP.map(({ key, label }) => {
                const isActive = selectedDays.includes(key);
                const isLocked = key === lockedDay;

                return (
                    <button
                        key={key}
                        type="button"
                        className={[
                            "day-recurrence-btn",
                            isActive ? "active" : "",
                            isLocked ? "locked" : "",
                        ].join(" ")}
                        onClick={() => toggle(key)}
                        title={key.charAt(0) + key.slice(1).toLowerCase()}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}
