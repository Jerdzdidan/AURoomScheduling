export default function WizardSteps({
    steps = [],
    currentStep = 0,
    onStepChange,
    canNavigateToStep,
}) {
    return (
        <div className="room-schedule-wizard-steps mb-4">
            <div className="row g-2">
                {steps.map((step, index) => {
                    const isActive = index === currentStep;
                    const isComplete = index < currentStep;
                    const isClickable = canNavigateToStep ? canNavigateToStep(index) : index <= currentStep;

                    return (
                        <div className="col-12 col-md-4 d-flex" key={step.id}>
                            <button
                                type="button"
                                className={`wizard-step-button ${isActive ? "is-active" : ""} ${isComplete ? "is-complete" : ""}`}
                                onClick={() => isClickable && onStepChange?.(index)}
                                disabled={!isClickable}
                            >
                                <span className="wizard-step-indicator">
                                    {isComplete ? (
                                        <i className="bx bx-check"></i>
                                    ) : (
                                        <>
                                            {step.icon && <i className={`${step.icon} me-1`}></i>}
                                            <span>{index + 1}</span>
                                        </>
                                    )}
                                </span>

                                <span className="wizard-step-copy">
                                    <span className="wizard-step-title">{step.title}</span>
                                    <span className="wizard-step-subtitle">{step.subtitle}</span>
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
