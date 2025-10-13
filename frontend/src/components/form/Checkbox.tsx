import React from 'react';
import './Checkbox.css';

export interface CheckboxProps {
  label: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Checkbox component with validation and accessibility
 * Usage: <Checkbox label="Accept terms" name="terms" checked={accepted} onChange={setAccepted} />
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  name,
  checked,
  onChange,
  error,
  disabled = false,
}) => {
  const checkboxId = `checkbox-${name}`;
  const errorId = `${checkboxId}-error`;
  const hasError = Boolean(error);

  return (
    <div className="checkbox-wrapper">
      <div className="checkbox-input-row">
        <input
          id={checkboxId}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className={`checkbox ${hasError ? 'checkbox-error' : ''} ${disabled ? 'checkbox-disabled' : ''}`}
        />
        <label htmlFor={checkboxId} className="checkbox-label">
          {label}
        </label>
      </div>
      {hasError && (
        <span id={errorId} className="checkbox-error-message" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
