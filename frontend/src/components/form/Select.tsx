import React from 'react';
import './Select.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Native select dropdown component with validation and accessibility
 * Usage: <Select label="Status" name="status" value={status} onChange={setStatus} options={statusOptions} />
 */
export const Select: React.FC<SelectProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  error,
  placeholder = 'Select an option',
  disabled = false,
  required = false,
}) => {
  const selectId = `select-${name}`;
  const errorId = `${selectId}-error`;
  const hasError = Boolean(error);

  return (
    <div className="select-wrapper">
      <label htmlFor={selectId} className="select-label">
        {label}
        {required && <span className="select-required" aria-label="required">*</span>}
      </label>
      <select
        id={selectId}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className={`select ${hasError ? 'select-error' : ''} ${disabled ? 'select-disabled' : ''}`}
      >
        <option value="" disabled={required}>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hasError && (
        <span id={errorId} className="select-error-message" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
