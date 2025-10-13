import React from 'react';
import './DatePicker.css';

export interface DatePickerProps {
  label: string;
  name: string;
  value: string | null; // ISO date string (YYYY-MM-DD)
  onChange: (value: string | null) => void;
  error?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
}

/**
 * HTML5 date picker component with validation and accessibility
 * Usage: <DatePicker label="Birth Date" name="birth_date" value={date} onChange={setDate} />
 * Value format: ISO date string "YYYY-MM-DD"
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  disabled = false,
  minDate,
  maxDate,
}) => {
  const dateId = `date-picker-${name}`;
  const errorId = `${dateId}-error`;
  const hasError = Boolean(error);

  return (
    <div className="date-picker-wrapper">
      <label htmlFor={dateId} className="date-picker-label">
        {label}
      </label>
      <input
        id={dateId}
        name={name}
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        min={minDate}
        max={maxDate}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className={`date-picker ${hasError ? 'date-picker-error' : ''} ${disabled ? 'date-picker-disabled' : ''}`}
      />
      {hasError && (
        <span id={errorId} className="date-picker-error-message" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
