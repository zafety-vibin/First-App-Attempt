/**
 * ModelSelector Component
 * Feature: 008-create-byollm-configuration
 * Task: T052
 *
 * Model selection with context window info
 */

import React, { useState, useEffect } from 'react';

interface Model {
  name: string;
  displayName: string;
  contextWindow: number;
  maxOutput: number;
}

interface ModelSelectorProps {
  provider: 'anthropic' | 'openai' | 'custom';
  value: string;
  onChange: (modelName: string) => void;
}

export function ModelSelector({ provider, value, onChange }: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadModels();
  }, [provider]);

  const loadModels = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/byollm/models?provider=${provider}`);
      if (!response.ok) {
        throw new Error('Failed to load models');
      }

      const data = await response.json();
      setModels(data);
    } catch (error) {
      console.error('Failed to load models:', error);
      // Use fallback models
      if (provider === 'anthropic') {
        setModels([
          {
            name: 'claude-3-5-sonnet-20241022',
            displayName: 'Claude 3.5 Sonnet',
            contextWindow: 200000,
            maxOutput: 8192,
          },
          {
            name: 'claude-3-opus-20240229',
            displayName: 'Claude 3 Opus',
            contextWindow: 200000,
            maxOutput: 4096,
          },
          {
            name: 'claude-3-sonnet-20240229',
            displayName: 'Claude 3 Sonnet',
            contextWindow: 200000,
            maxOutput: 4096,
          },
          {
            name: 'claude-3-haiku-20240307',
            displayName: 'Claude 3 Haiku',
            contextWindow: 200000,
            maxOutput: 4096,
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedModel = models.find((m) => m.name === value);

  if (loading) {
    return (
      <div className="model-selector">
        <label className="form-label">Model</label>
        <div className="loading">Loading models...</div>
      </div>
    );
  }

  return (
    <div className="model-selector">
      <label className="form-label">Model</label>

      <div className="model-options">
        {models.map((model) => (
          <button
            key={model.name}
            className={`model-option ${value === model.name ? 'selected' : ''}`}
            onClick={() => onChange(model.name)}
          >
            <div className="model-info">
              <div className="model-name">{model.displayName}</div>
              <div className="model-specs">
                {model.contextWindow.toLocaleString()} context •{' '}
                {model.maxOutput.toLocaleString()} max output
              </div>
            </div>
            {value === model.name && <div className="check-icon">✓</div>}
          </button>
        ))}
      </div>

      {selectedModel && (
        <div className="model-details">
          <h4>Model Details</h4>
          <dl className="details-list">
            <dt>Context Window</dt>
            <dd>{selectedModel.contextWindow.toLocaleString()} tokens</dd>

            <dt>Max Output</dt>
            <dd>{selectedModel.maxOutput.toLocaleString()} tokens</dd>

            {provider === 'anthropic' && selectedModel.name.includes('sonnet') && (
              <>
                <dt>Best For</dt>
                <dd>Balanced performance and cost</dd>
              </>
            )}

            {provider === 'anthropic' && selectedModel.name.includes('opus') && (
              <>
                <dt>Best For</dt>
                <dd>Complex reasoning and analysis</dd>
              </>
            )}

            {provider === 'anthropic' && selectedModel.name.includes('haiku') && (
              <>
                <dt>Best For</dt>
                <dd>Speed and efficiency</dd>
              </>
            )}
          </dl>
        </div>
      )}

      <style>{`
        .model-selector {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .loading {
          padding: 1rem;
          text-align: center;
          color: #9CA3AF;
          font-size: 0.875rem;
        }

        .model-options {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .model-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: white;
          border: 2px solid #E5E7EB;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
          width: 100%;
        }

        .model-option:hover {
          border-color: #3B82F6;
        }

        .model-option.selected {
          border-color: #3B82F6;
          background: #EFF6FF;
        }

        .model-info {
          flex: 1;
        }

        .model-name {
          font-weight: 600;
          color: #111827;
          margin-bottom: 0.25rem;
        }

        .model-specs {
          font-size: 0.75rem;
          color: #6B7280;
        }

        .check-icon {
          font-size: 1.25rem;
          color: #3B82F6;
          font-weight: bold;
        }

        .model-details {
          padding: 1rem;
          background: #F9FAFB;
          border-radius: 0.375rem;
          border: 1px solid #E5E7EB;
        }

        .model-details h4 {
          margin: 0 0 0.75rem 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #111827;
        }

        .details-list {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.5rem 1rem;
          margin: 0;
        }

        .details-list dt {
          font-size: 0.75rem;
          font-weight: 500;
          color: #6B7280;
        }

        .details-list dd {
          font-size: 0.75rem;
          color: #111827;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
