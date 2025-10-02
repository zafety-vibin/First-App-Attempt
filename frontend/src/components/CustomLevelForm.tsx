/**
 * CustomLevelForm - Form for creating/editing custom information levels
 * Feature: 004-create-a-tagging
 */

import React, { useState } from 'react';
import { useInformationLevel } from '../contexts/InformationLevelContext';

interface CustomLevelFormProps {
  campaignId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  editLevel?: {
    id: string;
    name: string;
    color: string;
    hierarchical: boolean;
  };
}

export function CustomLevelForm({ campaignId, onSuccess, onCancel, editLevel }: CustomLevelFormProps) {
  const [name, setName] = useState(editLevel?.name || '');
  const [color, setColor] = useState(editLevel?.color || '#8B5CF6');
  const [hierarchical, setHierarchical] = useState(editLevel?.hierarchical || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createLevel, updateLevel } = useInformationLevel();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (editLevel) {
        await updateLevel(editLevel.id, name, color, hierarchical);
      } else {
        await createLevel(name, color, hierarchical, campaignId);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save information level');
    } finally {
      setIsSubmitting(false);
    }
  };

  const presetColors = [
    '#EF4444', // Red
    '#F59E0B', // Orange
    '#EAB308', // Yellow
    '#84CC16', // Lime
    '#10B981', // Green
    '#14B8A6', // Teal
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#6B7280', // Gray
  ];

  return (
    <form onSubmit={handleSubmit} className="custom-level-form">
      <h3 className="form-title">{editLevel ? 'Edit' : 'Create'} Information Level</h3>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="level-name" className="form-label">
          Name
        </label>
        <input
          id="level-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Secret Plot, NPC Only"
          required
          maxLength={50}
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Color</label>
        <div className="color-presets">
          {presetColors.map(presetColor => (
            <button
              key={presetColor}
              type="button"
              className={`color-preset ${color === presetColor ? 'selected' : ''}`}
              style={{ backgroundColor: presetColor }}
              onClick={() => setColor(presetColor)}
              title={presetColor}
            />
          ))}
        </div>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="color-picker"
        />
      </div>

      <div className="form-group">
        <label className="form-checkbox-label">
          <input
            type="checkbox"
            checked={hierarchical}
            onChange={(e) => setHierarchical(e.target.checked)}
            className="form-checkbox"
          />
          <span className="checkbox-text">
            <strong>Hierarchical (Hidden in Player View)</strong>
            <span className="checkbox-hint">
              Check this to hide content with this level when toggled to Player View
            </span>
          </span>
        </label>
      </div>

      <div className="form-actions">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="btn-secondary"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="btn-primary"
        >
          {isSubmitting ? 'Saving...' : editLevel ? 'Update Level' : 'Create Level'}
        </button>
      </div>

      <style>{`
        .custom-level-form {
          background: white;
          padding: 1.5rem;
          border-radius: 0.5rem;
          max-width: 500px;
        }

        .form-title {
          margin: 0 0 1.5rem 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .form-error {
          background: #FEE2E2;
          border: 1px solid #EF4444;
          color: #DC2626;
          padding: 0.75rem;
          border-radius: 0.375rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .form-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #D1D5DB;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-family: inherit;
          transition: border-color 0.15s;
        }

        .form-input:focus {
          outline: none;
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .color-presets {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .color-preset {
          width: 100%;
          aspect-ratio: 1;
          border: 2px solid transparent;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.15s;
        }

        .color-preset:hover {
          transform: scale(1.1);
        }

        .color-preset.selected {
          border-color: #111827;
          box-shadow: 0 0 0 2px white, 0 0 0 4px #111827;
        }

        .color-picker {
          width: 100%;
          height: 40px;
          border: 1px solid #D1D5DB;
          border-radius: 0.375rem;
          cursor: pointer;
        }

        .form-checkbox-label {
          display: flex;
          gap: 0.75rem;
          cursor: pointer;
          align-items: flex-start;
        }

        .form-checkbox {
          margin-top: 0.25rem;
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .checkbox-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .checkbox-hint {
          font-size: 0.75rem;
          color: #6B7280;
          font-weight: 400;
        }

        .form-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 2rem;
        }

        .btn-primary,
        .btn-secondary {
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          border: none;
        }

        .btn-primary {
          background: #3B82F6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563EB;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #F3F4F6;
          color: #374151;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #E5E7EB;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </form>
  );
}
