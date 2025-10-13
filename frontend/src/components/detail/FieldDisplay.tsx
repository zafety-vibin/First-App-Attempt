import React from 'react';
import './FieldDisplay.css';

export interface FieldDisplayProps {
  label: string;
  value: any;
  type?: 'text' | 'date' | 'array' | 'json' | 'number';
  emptyText?: string;
}

/**
 * Generic field display component for entity detail views
 * Handles formatting for different value types
 *
 * Usage:
 * <FieldDisplay label="Name" value={entity.name} />
 * <FieldDisplay label="Created" value={entity.created_at} type="date" />
 * <FieldDisplay label="Tags" value={entity.tags} type="array" />
 */
export const FieldDisplay: React.FC<FieldDisplayProps> = ({
  label,
  value,
  type = 'text',
  emptyText = '—',
}) => {
  // Check if value is empty
  const isEmpty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);

  // Format value based on type
  const renderValue = () => {
    if (isEmpty) {
      return <span className="field-display-empty">{emptyText}</span>;
    }

    switch (type) {
      case 'date':
        // Unix timestamp to readable date
        if (typeof value === 'number') {
          const date = new Date(value * 1000);
          return (
            <time dateTime={date.toISOString()} className="field-display-date">
              {date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          );
        }
        return <span className="field-display-text">{String(value)}</span>;

      case 'array':
        // Array as comma-separated or bulleted list
        if (Array.isArray(value)) {
          if (value.length === 0) {
            return <span className="field-display-empty">{emptyText}</span>;
          }
          return (
            <ul className="field-display-array">
              {value.map((item, index) => (
                <li key={index} className="field-display-array-item">
                  {String(item)}
                </li>
              ))}
            </ul>
          );
        }
        return <span className="field-display-text">{String(value)}</span>;

      case 'json':
        // Pretty-printed JSON
        if (typeof value === 'object') {
          return (
            <pre className="field-display-json">
              <code>{JSON.stringify(value, null, 2)}</code>
            </pre>
          );
        }
        return <span className="field-display-text">{String(value)}</span>;

      case 'number':
        // Formatted number with commas
        if (typeof value === 'number') {
          return <span className="field-display-number">{value.toLocaleString()}</span>;
        }
        return <span className="field-display-text">{String(value)}</span>;

      case 'text':
      default:
        // Plain text (preserve line breaks)
        const text = String(value);
        if (text.includes('\n')) {
          return <div className="field-display-multiline">{text}</div>;
        }
        return <span className="field-display-text">{text}</span>;
    }
  };

  return (
    <div className="field-display">
      <dt className="field-display-label">{label}</dt>
      <dd className="field-display-value">{renderValue()}</dd>
    </div>
  );
};
