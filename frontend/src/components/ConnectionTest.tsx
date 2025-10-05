/**
 * ConnectionTest Component
 * Feature: 008-create-byollm-configuration
 * Task: T053
 *
 * Tests connection to provider API with MCP validation
 */

import React, { useState } from 'react';

interface ConnectionTestProps {
  campaignId?: string;
}

interface TestResult {
  success: boolean;
  provider?: string;
  modelName?: string;
  contextWindow?: number;
  bulkOperationsReady?: boolean;
  streaming?: boolean;
  timeout?: number;
  retries?: number;
  latencyMs?: number;
  error?: string;
  warnings?: string[];
}

export function ConnectionTest({ campaignId }: ConnectionTestProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleTest = async () => {
    try {
      setTesting(true);
      setResult(null);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/byollm/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: campaignId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Connection test failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Connection test error:', error);
      setResult({
        success: false,
        error: (error as Error).message,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="connection-test">
      <div className="test-header">
        <h4>Connection Test</h4>
        <button
          onClick={handleTest}
          disabled={testing}
          className="test-button"
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {result && (
        <div className={`test-result ${result.success ? 'success' : 'error'}`}>
          {result.success ? (
            <>
              <div className="result-header">
                <span className="icon">✓</span>
                <span className="status">Connection Successful</span>
              </div>

              <dl className="result-details">
                <dt>Provider</dt>
                <dd>{result.provider}</dd>

                <dt>Model</dt>
                <dd>{result.modelName}</dd>

                {result.contextWindow && (
                  <>
                    <dt>Context Window</dt>
                    <dd>{result.contextWindow.toLocaleString()} tokens</dd>
                  </>
                )}

                {result.latencyMs && (
                  <>
                    <dt>Latency</dt>
                    <dd>{result.latencyMs}ms</dd>
                  </>
                )}

                {result.streaming !== undefined && (
                  <>
                    <dt>Streaming</dt>
                    <dd>{result.streaming ? '✓ Enabled' : '✗ Disabled'}</dd>
                  </>
                )}

                {result.timeout && (
                  <>
                    <dt>Timeout</dt>
                    <dd>{result.timeout}s</dd>
                  </>
                )}

                {result.retries !== undefined && (
                  <>
                    <dt>Retry Attempts</dt>
                    <dd>{result.retries}</dd>
                  </>
                )}

                {result.bulkOperationsReady !== undefined && (
                  <>
                    <dt>Bulk Operations</dt>
                    <dd>{result.bulkOperationsReady ? '✓ Ready' : '✗ Not Ready'}</dd>
                  </>
                )}
              </dl>

              {result.warnings && result.warnings.length > 0 && (
                <div className="warnings">
                  <strong>Warnings:</strong>
                  <ul>
                    {result.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="result-header">
                <span className="icon">✗</span>
                <span className="status">Connection Failed</span>
              </div>
              <div className="error-message">
                {result.error}
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        .connection-test {
          margin-bottom: 1.5rem;
          padding: 1.5rem;
          background: #F9FAFB;
          border-radius: 0.5rem;
          border: 1px solid #E5E7EB;
        }

        .test-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .test-header h4 {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #111827;
        }

        .test-button {
          padding: 0.5rem 1rem;
          background: #3B82F6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }

        .test-button:hover:not(:disabled) {
          background: #2563EB;
        }

        .test-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .test-result {
          padding: 1rem;
          border-radius: 0.375rem;
        }

        .test-result.success {
          background: #D1FAE5;
          border: 1px solid #6EE7B7;
        }

        .test-result.error {
          background: #FEE2E2;
          border: 1px solid #FCA5A5;
        }

        .result-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .result-header .icon {
          font-size: 1.25rem;
        }

        .test-result.success .icon {
          color: #059669;
        }

        .test-result.error .icon {
          color: #DC2626;
        }

        .status {
          font-weight: 600;
          font-size: 0.875rem;
        }

        .test-result.success .status {
          color: #065F46;
        }

        .test-result.error .status {
          color: #991B1B;
        }

        .result-details {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.5rem 1rem;
          margin: 0;
          font-size: 0.75rem;
        }

        .result-details dt {
          font-weight: 500;
          color: #059669;
        }

        .result-details dd {
          color: #065F46;
          margin: 0;
        }

        .error-message {
          font-size: 0.75rem;
          color: #991B1B;
          line-height: 1.5;
        }

        .warnings {
          margin-top: 1rem;
          padding: 0.75rem;
          background: #FEF3C7;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          color: #92400E;
        }

        .warnings strong {
          display: block;
          margin-bottom: 0.5rem;
        }

        .warnings ul {
          margin: 0;
          padding-left: 1.25rem;
        }

        .warnings li {
          margin-bottom: 0.25rem;
        }
      `}</style>
    </div>
  );
}
