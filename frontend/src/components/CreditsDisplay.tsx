/**
 * CreditsDisplay Component
 * Feature: 008-create-byollm-configuration
 * Task: T054
 *
 * Displays credits/usage from provider (prevents surprise costs)
 */

import React, { useState, useEffect } from 'react';

interface Credits {
  balance: number;
  currency: string;
  organizationName: string;
  lastUpdated: number;
}

interface CreditsDisplayProps {
  campaignId?: string;
}

export function CreditsDisplay({ campaignId }: CreditsDisplayProps) {
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCredits();
  }, [campaignId]);

  const loadCredits = async () => {
    if (!campaignId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/byollm/credits?campaignId=${campaignId}`);

      if (response.status === 404) {
        // No credits data available
        setCredits(null);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load credits');
      }

      const data = await response.json();
      setCredits(data);
    } catch (err) {
      console.error('Failed to load credits:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="credits-display">
        <h4>Credits & Usage</h4>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="credits-display">
        <h4>Credits & Usage</h4>
        <div className="error">
          Unable to load credits data
        </div>
      </div>
    );
  }

  if (!credits) {
    return (
      <div className="credits-display">
        <h4>Credits & Usage</h4>
        <div className="no-data">
          Credits data not available from provider
        </div>
      </div>
    );
  }

  const isLowBalance = credits.balance < 1.0;
  const lastUpdatedDate = new Date(credits.lastUpdated).toLocaleString();

  return (
    <div className="credits-display">
      <div className="credits-header">
        <h4>Credits & Usage</h4>
        <button onClick={loadCredits} className="refresh-button" disabled={loading}>
          🔄
        </button>
      </div>

      <div className={`credits-content ${isLowBalance ? 'low-balance' : ''}`}>
        <div className="balance-section">
          <div className="balance-label">Balance</div>
          <div className="balance-amount">
            {credits.currency === 'USD' && '$'}
            {credits.balance.toFixed(2)}
            {credits.currency !== 'USD' && ` ${credits.currency}`}
          </div>
        </div>

        {isLowBalance && (
          <div className="low-balance-warning">
            ⚠️ Low balance - add credits to avoid service interruption
          </div>
        )}

        <div className="credits-details">
          <dl>
            <dt>Organization</dt>
            <dd>{credits.organizationName}</dd>

            <dt>Last Updated</dt>
            <dd>{lastUpdatedDate}</dd>
          </dl>
        </div>
      </div>

      <style>{`
        .credits-display {
          margin-bottom: 1.5rem;
          padding: 1.5rem;
          background: #F9FAFB;
          border-radius: 0.5rem;
          border: 1px solid #E5E7EB;
        }

        .credits-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .credits-header h4 {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #111827;
        }

        .refresh-button {
          background: none;
          border: none;
          font-size: 1rem;
          cursor: pointer;
          padding: 0.25rem;
          opacity: 0.6;
          transition: all 0.15s;
        }

        .refresh-button:hover:not(:disabled) {
          opacity: 1;
          transform: rotate(180deg);
        }

        .refresh-button:disabled {
          cursor: not-allowed;
        }

        .loading,
        .error,
        .no-data {
          padding: 1rem;
          text-align: center;
          font-size: 0.75rem;
          color: #9CA3AF;
        }

        .error {
          color: #DC2626;
          background: #FEE2E2;
          border-radius: 0.375rem;
        }

        .credits-content {
          padding: 1rem;
          background: white;
          border-radius: 0.375rem;
          border: 1px solid #E5E7EB;
        }

        .credits-content.low-balance {
          border-color: #FBBF24;
        }

        .balance-section {
          margin-bottom: 1rem;
          text-align: center;
        }

        .balance-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: #6B7280;
          margin-bottom: 0.25rem;
        }

        .balance-amount {
          font-size: 1.875rem;
          font-weight: 700;
          color: #111827;
        }

        .credits-content.low-balance .balance-amount {
          color: #DC2626;
        }

        .low-balance-warning {
          padding: 0.75rem;
          background: #FEF3C7;
          color: #92400E;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
          text-align: center;
          margin-bottom: 1rem;
        }

        .credits-details {
          border-top: 1px solid #E5E7EB;
          padding-top: 1rem;
        }

        .credits-details dl {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.5rem 1rem;
          margin: 0;
          font-size: 0.75rem;
        }

        .credits-details dt {
          font-weight: 500;
          color: #6B7280;
        }

        .credits-details dd {
          color: #111827;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
