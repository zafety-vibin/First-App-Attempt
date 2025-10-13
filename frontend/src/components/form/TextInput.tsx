import React from 'react';
import './TextInput.css';

export interface TextInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Text input field component with validation and accessibility
 * Usage: <TextInput label="Name" name="name" value={name} onChange={setName} required />
 */
export const TextInput: React.FC<TextInputProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  disabled = false,
  required = false,
}) => {
  const inputId = `text-input-${name}`;
  const errorId = `${inputId}-error`;
  const hasError = Boolean(error);

  return (
    <div className="text-input-wrapper">
      <label htmlFor={inputId} className="text-input-label">
        {label}
        {required && <span className="text-input-required" aria-label="required">*</span>}
      </label>
      <input
        id={inputId}
        name={name}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className={`text-input ${hasError ? 'text-input-error' : ''} ${disabled ? 'text-input-disabled' : ''}`}
      />
      {hasError && (
        <span id={errorId} className="text-input-error-message" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
