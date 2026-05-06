import { useEffect, useRef } from 'react';

/**
 * A reusable Select2-powered dropdown component.
 *
 * @param {string}   id            - Unique element ID for the select
 * @param {string}   label         - Label text displayed above the dropdown
 * @param {string}   name          - Form field name
 * @param {string}   placeholder   - Select2 placeholder text
 * @param {string}   value         - Currently selected value (controlled)
 * @param {function} onChange      - Callback receiving the new value string
 * @param {Array}    options       - Array of { id, name, code? } objects
 * @param {function} [renderOption]- Optional renderer: (option) => display string
 * @param {string}   [dropdownParent] - jQuery selector for the dropdown parent (e.g. offcanvas id)
 * @param {string}   [error]       - Validation error message
 * @param {string}   [help]        - Help text shown when options list is empty
 */
export default function SelectField({
    id,
    label,
    name,
    placeholder = 'Select an option',
    value,
    onChange,
    options = [],
    renderOption,
    dropdownParent,
    error,
    help,
    disabled = false,
    required = false,
}) {
    const selectRef = useRef(null);
    const onChangeRef = useRef(onChange);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    const defaultRenderOption = (option) =>
        option.code ? `${option.code} - ${option.name}` : option.name;

    const displayOption = renderOption || defaultRenderOption;

    // Initialize & destroy Select2
    useEffect(() => {
        const $select = $(selectRef.current);

        if (!$select.length) return;

        if ($select.hasClass('select2-hidden-accessible')) {
            $select.select2('destroy');
        }

        const config = {
            placeholder,
            allowClear: true,
            width: '100%',
        };

        if (dropdownParent) {
            config.dropdownParent = $(dropdownParent);
        }

        $select.select2(config);

        $select.on('change', function () {
            onChangeRef.current?.($(this).val() || '');
        });

        return () => {
            $select.off('change');
            if ($select.hasClass('select2-hidden-accessible')) {
                $select.select2('destroy');
            }
        };
    }, [options, dropdownParent, disabled]);

    // Sync Select2 value with React state
    useEffect(() => {
        const $select = $(selectRef.current);

        if (!$select.length || !$select.hasClass('select2-hidden-accessible')) {
            return;
        }

        if (value) {
            $select.val(String(value)).trigger('change.select2');
        } else {
            $select.val(null).trigger('change.select2');
        }
    }, [value, options]);

    useEffect(() => {
        const $select = $(selectRef.current);

        if (!$select.length || !$select.hasClass('select2-hidden-accessible')) {
            return;
        }

        const $container = $select.next('.select2-container');
        const $selection = $container.find('.select2-selection');

        if (error) {
            $selection.css('border-color', '#fc4225');
        } else {
            $selection.css('border-color', '');
        }
    }, [error]);

    return (
        <div className="mb-3">
            {label && (
                <label className="form-label" htmlFor={id}>
                    {label}
                    {required && <span className="text-danger"> *</span>}
                </label>
            )}
            <select
                ref={selectRef}
                id={id}
                name={name}
                className="form-select"
                defaultValue=""
                disabled={disabled}
            >
                <option value=""></option>
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {displayOption(option)}
                    </option>
                ))}
            </select>
            {error && <div className="invalid-feedback d-block">{error}</div>}
            {help && !options.length && (
                <div className="form-text">{help}</div>
            )}
        </div>
    );
}
