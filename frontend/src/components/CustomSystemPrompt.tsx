/**
 * CustomSystemPrompt Component
 * Feature: 008-create-byollm-configuration
 * Task: T055
 *
 * Custom system prompt input for Import/Planning AI
 */

import React, { useState } from 'react';

interface CustomSystemPromptProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

export function CustomSystemPrompt({
  label,
  description,
  value,
  onChange,
}: CustomSystemPromptProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="custom-system-prompt">
      <div className="prompt-header">
        <div>
          <label className="form-label">{label}</label>
          <p className="prompt-description">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="expand-button"
        >
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      {expanded && (
        <div className="prompt-content">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter custom system prompt (optional)"
            className="prompt-textarea"
            rows={6}
          />

          <div className="prompt-help">
            <h5>Tips for custom prompts:</h5>
            <ul>
              <li>Describe the tone and style you want (e.g., formal, casual, creative)</li>
              <li>Specify domain expertise (e.g., fantasy TTRPG, sci-fi horror)</li>
              <li>Include formatting preferences for generated content</li>
              <li>Leave blank to use the default prompt</li>
            </ul>
          </div>

          {value && (
            <div className="prompt-preview">
              <h5>Preview</h5>
              <div className="preview-text">{value}</div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .custom-system-prompt {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: #F9FAFB;
          border-radius: 0.5rem;
          border: 1px solid #E5E7EB;
        }

        .prompt-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .form-label {
          display: block;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .prompt-description {
          margin: 0;
          font-size: 0.75rem;
          color: #6B7280;
          line-height: 1.5;
        }

        .expand-button {
          background: #E5E7EB;
          border: none;
          border-radius: 0.25rem;
          padding: 0.375rem 0.75rem;
          font-size: 0.75rem;
          cursor: pointer;
          transition: background 0.15s;
          flex-shrink: 0;
        }

        .expand-button:hover {
          background: #D1D5DB;
        }

        .prompt-content {
          margin-top: 1rem;
        }

        .prompt-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #D1D5DB;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-family: inherit;
          line-height: 1.5;
          resize: vertical;
          transition: border-color 0.15s;
        }

        .prompt-textarea:focus {
          outline: none;
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .prompt-help {
          margin-top: 1rem;
          padding: 1rem;
          background: white;
          border-radius: 0.375rem;
          border: 1px solid #E5E7EB;
        }

        .prompt-help h5 {
          margin: 0 0 0.5rem 0;
          font-size: 0.75rem;
          font-weight: 600;
          color: #111827;
        }

        .prompt-help ul {
          margin: 0;
          padding-left: 1.25rem;
          font-size: 0.75rem;
          color: #6B7280;
          line-height: 1.75;
        }

        .prompt-help li {
          margin-bottom: 0.25rem;
        }

        .prompt-preview {
          margin-top: 1rem;
          padding: 1rem;
          background: white;
          border-radius: 0.375rem;
          border: 1px solid #E5E7EB;
        }

        .prompt-preview h5 {
          margin: 0 0 0.5rem 0;
          font-size: 0.75rem;
          font-weight: 600;
          color: #111827;
        }

        .preview-text {
          font-size: 0.75rem;
          color: #374151;
          line-height: 1.75;
          white-space: pre-wrap;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}
