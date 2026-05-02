export default function FormSteps({
    steps = [],
    currentStep = 0,
    onStepChange,
    canNavigateToStep,
}) {
    const columnClass = `row g-2 row-cols-1 row-cols-md-${Math.min(Math.max(steps.length, 1), 4)}`;

    return (
        <div className="form-steps mb-4">
            <div className={columnClass}>
                {steps.map((step, index) => {
                    const isActive = index === currentStep;
                    const isComplete = index < currentStep;
                    const isClickable = canNavigateToStep ? canNavigateToStep(index) : index <= currentStep;

                    return (
                        <div className="col d-flex" key={step.id}>
                            <button
                                type="button"
                                className={`form-step-button ${isActive ? "is-active" : ""} ${isComplete ? "is-complete" : ""}`}
                                onClick={() => isClickable && onStepChange?.(index)}
                                disabled={!isClickable}
                            >
                                <span className="form-step-indicator">
                                    {isComplete ? (
                                        <i className="bx bx-check"></i>
                                    ) : (
                                        <>
                                            {step.icon && <i className={`${step.icon} me-1`}></i>}
                                            <span>{index + 1}</span>
                                        </>
                                    )}
                                </span>

                                <span className="form-step-copy">
                                    <span className="form-step-title">{step.title}</span>
                                    <span className="form-step-subtitle">{step.subtitle}</span>
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
