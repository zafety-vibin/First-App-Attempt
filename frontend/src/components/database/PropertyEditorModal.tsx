/**
 * PropertyEditorModal - Modal for adding/editing database properties
 * Feature: 003-create-a-notion
 */

import React, { useState } from 'react';

interface PropertyEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, type: string, options?: string[]) => void;
}

const COLUMN_TYPES = [
  { id: 'text', label: 'Text', icon: '📝', description: 'Plain text field' },
  { id: 'number', label: 'Number', icon: '#️⃣', description: 'Numeric value' },
  { id: 'date', label: 'Date', icon: '📅', description: 'Date picker' },
  { id: 'select', label: 'Select', icon: '🏷️', description: 'Single choice from options' },
  { id: 'multi-select', label: 'Multi-select', icon: '🏷️', description: 'Multiple choices' },
  { id: 'entity-reference', label: 'Entity Reference', icon: '🔗', description: 'Link to another card' },
];

export function PropertyEditorModal({ isOpen, onClose, onSave }: PropertyEditorModalProps) {
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState('text');
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) {
      alert('Property name is required');
      return;
    }

    // For select/multi-select, require at least one option
    if ((selectedType === 'select' || selectedType === 'multi-select') && options.length === 0) {
      alert('Please add at least one option for select/multi-select properties');
      return;
    }

    // For select/multi-select, pass options as well
    const columnData: any = { name, type: selectedType };
    if ((selectedType === 'select' || selectedType === 'multi-select') && options.length > 0) {
      columnData.options = options;
    }

    onSave(columnData.name, columnData.type, columnData.options);
    setName('');
    setSelectedType('text');
    setOptions([]);
    setNewOption('');
    onClose();
  };

  const handleCancel = () => {
    setName('');
    setSelectedType('text');
    setOptions([]);
    setNewOption('');
    onClose();
  };

  const handleAddOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (option: string) => {
    setOptions(options.filter(o => o !== option));
  };

  return (
    <>
      <div className="modal-overlay" onClick={handleCancel}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Add Property</h3>
            <button className="btn-close" onClick={handleCancel}>✕</button>
          </div>

          <div className="modal-body">
            {/* Property Name */}
            <div className="form-group">
              <label>Property Name</label>
              <input
                type="text"
                className="input-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Location Type"
                autoFocus
              />
            </div>

            {/* Property Type */}
            <div className="form-group">
              <label>Property Type</label>
              <div className="type-list">
                {COLUMN_TYPES.map((type) => (
                  <div
                    key={type.id}
                    className={`type-item ${selectedType === type.id ? 'selected' : ''}`}
                    onClick={() => setSelectedType(type.id)}
                  >
                    <span className="type-icon">{type.icon}</span>
                    <div className="type-info">
                      <div className="type-label">{type.label}</div>
                      <div className="type-description">{type.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Options configuration for select/multi-select */}
            {(selectedType === 'select' || selectedType === 'multi-select') && (
              <div className="form-group">
                <label>Options</label>
                <div className="options-list">
                  {options.map((option, index) => (
                    <div key={index} className="option-item">
                      <span className="option-text">{option}</span>
                      <button
                        type="button"
                        className="btn-remove-option"
                        onClick={() => handleRemoveOption(option)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="add-option-row">
                    <input
                      type="text"
                      className="input-option"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                      placeholder="Add an option..."
                    />
                    <button
                      type="button"
                      className="btn-add-option"
                      onClick={handleAddOption}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
            <button className="btn-save" onClick={handleSave}>Add Property</button>
          </div>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .btn-close {
          background: none;
          border: none;
          font-size: 20px;
          color: #6b7280;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
        }

        .btn-close:hover {
          color: #111827;
        }

        .modal-body {
          padding: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }

        .input-name {
          width: 100%;
          padding: 8px 12px;
          font-size: 14px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          outline: none;
        }

        .input-name:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .type-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .type-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.1s;
        }

        .type-item:hover {
          background: #f3f4f6;
        }

        .type-item.selected {
          background: #dbeafe;
        }

        .type-icon {
          font-size: 18px;
          width: 24px;
          text-align: center;
          flex-shrink: 0;
        }

        .type-info {
          flex: 1;
        }

        .type-label {
          font-size: 14px;
          font-weight: 500;
          color: #111827;
        }

        .type-description {
          font-size: 12px;
          color: #6b7280;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 16px 20px;
          border-top: 1px solid #e5e7eb;
        }

        .btn-cancel,
        .btn-save {
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
        }

        .btn-cancel {
          background: none;
          color: #6b7280;
        }

        .btn-cancel:hover {
          background: #f3f4f6;
        }

        .btn-save {
          background: #2563eb;
          color: white;
        }

        .btn-save:hover {
          background: #1d4ed8;
        }

        .options-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .option-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          background: #f3f4f6;
          border-radius: 4px;
        }

        .option-text {
          font-size: 14px;
          color: #374151;
        }

        .btn-remove-option {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          font-size: 14px;
          padding: 0 4px;
        }

        .btn-remove-option:hover {
          color: #ef4444;
        }

        .add-option-row {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        .input-option {
          flex: 1;
          padding: 6px 10px;
          font-size: 14px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          outline: none;
        }

        .input-option:focus {
          border-color: #2563eb;
        }

        .btn-add-option {
          padding: 6px 12px;
          background: #f3f4f6;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          color: #374151;
          cursor: pointer;
        }

        .btn-add-option:hover {
          background: #e5e7eb;
        }
      `}</style>
    </>
  );
}
