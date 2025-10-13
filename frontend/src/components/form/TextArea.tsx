import React, { useState, useEffect } from 'react';
import './TextArea.css';

export interface TextAreaProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
}

/**
 * Textarea input component with validation, character counter, and accessibility
 * Usage: <TextArea label="Description" name="description" value={desc} onChange={setDesc} rows={5} maxLength={500} />
 */
export const TextArea: React.FC<TextAreaProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  rows = 5,
  disabled = false,
  required = false,
  maxLength,
}) => {
  const textareaId = `textarea-${name}`;
  const errorId = `${textareaId}-error`;
  const hasError = Boolean(error);
  const [charCount, setCharCount] = useState(value.length);

  useEffect(() => {
    setCharCount(value.length);
  }, [value]);

  return (
    <div className="textarea-wrapper">
      <div className="textarea-label-row">
        <label htmlFor={textareaId} className="textarea-label">
          {label}
          {required && <span className="textarea-required" aria-label="required">*</span>}
        </label>
        {maxLength && (
          <span className="textarea-counter" aria-live="polite">
            {charCount} / {maxLength}
          </span>
        )}
      </div>
      <textarea
        id={textareaId}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className={`textarea ${hasError ? 'textarea-error' : ''} ${disabled ? 'textarea-disabled' : ''}`}
      />
      {hasError && (
        <span id={errorId} className="textarea-error-message" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
