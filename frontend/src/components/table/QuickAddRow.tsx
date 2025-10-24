import React, { useState, useRef } from 'react';
import './QuickAddRow.css';

export interface QuickAddRowProps {
  onAdd: (data: Record<string, any>) => Promise<void>;
  columns: Array<{
    fieldKey: string;
    label: string;
    type: 'text' | 'number' | 'dropdown' | 'player_knowledge';
    required?: boolean;
    dropdownOptions?: Array<{ value: string; label: string }>;
  }>;
}

/**
 * QuickAddRow Component
 * Footer row for rapidly adding new entities without leaving the table
 * Shows minimal required fields (name + visibility by default)
 */
export const QuickAddRow: React.FC<QuickAddRowProps> = ({ onAdd, columns }) => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (fieldKey: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldKey]: value }));
    setError(null);
  };

  const handleAdd = async () => {
    // Validate required fields
    const missingRequired = columns
      .filter(col => col.required)
      .filter(col => !values[col.fieldKey] || values[col.fieldKey] === '');

    if (missingRequired.length > 0) {
      setError(`Required: ${missingRequired.map(c => c.label).join(', ')}`);
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      await onAdd(values);
      // Clear form after successful add
      setValues({});
      // Re-focus first input for quick consecutive adds
      if (firstInputRef.current) {
        firstInputRef.current.focus();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create entity');
      console.error('Quick-add error:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, isLastField: boolean) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isLastField) {
        handleAdd();
      }
    } else if (e.key === 'Escape') {
      setValues({});
      setError(null);
    }
  };

  return (
    <tr className="quick-add-row">
      {columns.map((column, index) => {
        const isFirstField = index === 0;
        const isLastField = index === columns.length - 1;

        return (
          <td key={column.fieldKey} className="quick-add-cell">
            {column.type === 'dropdown' ? (
              <select
                value={values[column.fieldKey] || ''}
                onChange={(e) => handleChange(column.fieldKey, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, isLastField)}
                className="quick-add-select"
                disabled={isAdding}
              >
                <option value="">Select {column.label}...</option>
                {column.dropdownOptions?.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : column.type === 'player_knowledge' ? (
              <select
                value={values[column.fieldKey] || 'common_knowledge'}
                onChange={(e) => handleChange(column.fieldKey, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, isLastField)}
                className="quick-add-select"
                disabled={isAdding}
              >
                <option value="system">System</option>
                <option value="common_knowledge">Common Knowledge</option>
                <option value="player_knowledge">Player Knowledge</option>
                <option value="dm_only">DM Only</option>
              </select>
            ) : column.type === 'number' ? (
              <input
                ref={isFirstField ? firstInputRef : null}
                type="number"
                value={values[column.fieldKey] || ''}
                onChange={(e) => handleChange(column.fieldKey, e.target.value ? Number(e.target.value) : null)}
                onKeyDown={(e) => handleKeyDown(e, isLastField)}
                placeholder={column.required ? `${column.label} *` : column.label}
                className="quick-add-input"
                disabled={isAdding}
              />
            ) : (
              <input
                ref={isFirstField ? firstInputRef : null}
                type="text"
                value={values[column.fieldKey] || ''}
                onChange={(e) => handleChange(column.fieldKey, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, isLastField)}
                placeholder={column.required ? `${column.label} *` : column.label}
                className="quick-add-input"
                disabled={isAdding}
              />
            )}
          </td>
        );
      })}
      <td className="quick-add-cell quick-add-actions">
        <button
          className="quick-add-button"
          onClick={handleAdd}
          disabled={isAdding}
          title="Add (or press Enter in last field)"
        >
          {isAdding ? 'Adding...' : '+ Add'}
        </button>
        {error && <span className="quick-add-error">{error}</span>}
      </td>
    </tr>
  );
};
