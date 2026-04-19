export default function InputField({ 
    id, 
    label, 
    icon, 
    type = 'text', 
    name, 
    placeholder = '', 
    value, 
    onChange, 
    error, 
    help,
    disabled = false,
    readOnly = false,
}) {
    return (
        <div className="mb-3">
            {label && <label className="form-label" htmlFor={id}>{label}</label>}
            <div className={`input-group ${disabled ? '' : 'input-group-merge'} mb-2`}>
                {icon && (
                    <span className="input-group-text" style={{ 
                        ...(error ? { borderColor: '#fc4225' } : {})
                    }}>
                        <i className={icon}></i>
                    </span>
                )}
                <input 
                    type={type} 
                    id={id} 
                    name={name} 
                    className="form-control" 
                    placeholder={placeholder} 
                    aria-label={label} 
                    value={value} 
                    onChange={onChange}
                    disabled={disabled}
                    readOnly={readOnly}
                    style={error ? { borderColor: '#fc4225' } : {}}
                />
            </div>
            {error && <div className="invalid-feedback d-block">{error}</div>}
            {help && !error && <div className="form-text">{help}</div>}
        </div>
    );
}
