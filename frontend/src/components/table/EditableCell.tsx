import React, { useState, useEffect, useRef } from 'react';
import './EditableCell.css';

export type EditableCellType = 'text' | 'textarea' | 'number' | 'dropdown' | 'tags' | 'player_knowledge';

export interface EditableCellProps {
  value: any;
  type: EditableCellType;
  fieldKey: string;
  entityId: string;
  onUpdate: (entityId: string, fieldKey: string, newValue: any) => Promise<void>;
  dropdownOptions?: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * EditableCell Component
 * Supports click-to-edit with auto-save (500ms debounce)
 * Handles different field types: text, number, dropdown, tags, player_knowledge
 */
export const EditableCell: React.FC<EditableCellProps> = ({
  value,
  type,
  fieldKey,
  entityId,
  onUpdate,
  dropdownOptions = [],
  placeholder = 'Click to edit',
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update current value when prop value changes (e.g., after successful save)
  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  // Auto-save with 500ms debounce
  const handleSave = async (newValue: any) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Don't save if value hasn't changed
    if (newValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onUpdate(entityId, fieldKey, newValue);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
      console.error('Save error:', err);
      // Revert to original value on error
      setCurrentValue(value);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (newValue: any) => {
    setCurrentValue(newValue);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (500ms debounce)
    saveTimeoutRef.current = setTimeout(() => {
      handleSave(newValue);
    }, 500);
  };

  const handleBlur = () => {
    // Cancel pending save on blur
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    // Trigger immediate save
    handleSave(currentValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // For textarea, Ctrl+Enter or Cmd+Enter saves, Escape cancels
    if (type === 'textarea') {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleBlur();
      } else if (e.key === 'Escape') {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        setCurrentValue(value);
        setIsEditing(false);
      }
    } else if (e.key === 'Enter' && type !== 'text') {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      // Cancel edit and revert
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      setCurrentValue(value);
      setIsEditing(false);
    }
  };

  const renderDisplayValue = () => {
    if (currentValue === null || currentValue === undefined || currentValue === '') {
      return <span className="editable-cell-empty">{placeholder}</span>;
    }

    switch (type) {
      case 'tags':
        if (Array.isArray(currentValue) && currentValue.length > 0) {
          return <span className="editable-cell-tags">{currentValue.join(', ')}</span>;
        }
        return <span className="editable-cell-empty">No tags</span>;

      case 'player_knowledge':
        // Display as badge
        const badgeClass = `player-knowledge-badge player-knowledge-${currentValue || 'common_knowledge'}`;
        const labelMap: Record<string, string> = {
          system: 'System',
          common_knowledge: 'Common',
          player_knowledge: 'Player',
          dm_only: 'DM Only',
        };
        return <span className={badgeClass}>{labelMap[currentValue] || currentValue}</span>;

      case 'dropdown':
        const option = dropdownOptions.find(opt => opt.value === currentValue);
        return <span>{option?.label || currentValue}</span>;

      default:
        return <span>{String(currentValue)}</span>;
    }
  };

  const renderEditInput = () => {
    switch (type) {
      case 'number':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="number"
            value={currentValue || ''}
            onChange={(e) => handleChange(e.target.value ? Number(e.target.value) : null)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="editable-cell-input"
            disabled={isSaving}
          />
        );

      case 'dropdown':
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={currentValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="editable-cell-select"
            disabled={isSaving}
          >
            <option value="">Select...</option>
            {dropdownOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'tags':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={Array.isArray(currentValue) ? currentValue.join(', ') : ''}
            onChange={(e) => {
              const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
              handleChange(tags);
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="editable-cell-input"
            placeholder="tag1, tag2, tag3"
            disabled={isSaving}
          />
        );

      case 'player_knowledge':
        // Simple dropdown for database tables (wiki uses PaintersEaselPalette)
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={currentValue || 'common_knowledge'}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="editable-cell-select visibility-select"
            disabled={isSaving}
          >
            <option value="system">System</option>
            <option value="common_knowledge">Common Knowledge</option>
            <option value="player_knowledge">Player Knowledge</option>
            <option value="dm_only">DM Only</option>
          </select>
        );

      case 'textarea':
        // Multi-line textarea for long text fields (description, appearance, etc.)
        return (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={currentValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="editable-cell-textarea"
            rows={4}
            disabled={isSaving}
            placeholder="Click to edit... (Ctrl+Enter to save, Esc to cancel)"
          />
        );

      case 'text':
      default:
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={currentValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="editable-cell-input"
            disabled={isSaving}
          />
        );
    }
  };

  if (disabled) {
    return <div className="editable-cell editable-cell-disabled">{renderDisplayValue()}</div>;
  }

  return (
    <div className="editable-cell-wrapper">
      {isEditing ? (
        <div
          className="editable-cell editable-cell-editing"
          onClick={(e) => e.stopPropagation()} // Prevent row click while editing
        >
          {renderEditInput()}
          {isSaving && <span className="editable-cell-saving">Saving...</span>}
        </div>
      ) : (
        <div
          className="editable-cell editable-cell-display"
          onClick={(e) => {
            e.stopPropagation(); // Prevent row click
            setIsEditing(true);
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation(); // Prevent row click
              setIsEditing(true);
            }
          }}
          role="button"
          tabIndex={0}
          title="Click to edit"
        >
          {renderDisplayValue()}
        </div>
      )}
      {error && <div className="editable-cell-error">{error}</div>}
    </div>
  );
};
