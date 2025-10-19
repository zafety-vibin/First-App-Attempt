/**
 * Wizard Navigation
 * Feature: 016-create-a-campaign
 * T017: Back/Next/Finish buttons
 */

import React from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

interface WizardNavigationProps {
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  showBack: boolean;
  showNext: boolean;
  showFinish: boolean;
  canProceed: boolean;
  isSubmitting?: boolean;
}

export default function WizardNavigation({
  onBack,
  onNext,
  onFinish,
  showBack,
  showNext,
  showFinish,
  canProceed,
  isSubmitting = false
}: WizardNavigationProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: '1rem',
      marginTop: '2rem',
      paddingTop: '1.5rem',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div>
        {showBack && (
          <button
            onClick={onBack}
            disabled={isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.5 : 1
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {showNext && (
          <button
            onClick={onNext}
            disabled={!canProceed || isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: canProceed && !isSubmitting ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: canProceed && !isSubmitting ? 'pointer' : 'not-allowed',
              opacity: canProceed && !isSubmitting ? 1 : 0.5
            }}
          >
            Next <ArrowRight size={16} />
          </button>
        )}

        {showFinish && (
          <button
            onClick={onFinish}
            disabled={!canProceed || isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: canProceed && !isSubmitting ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: canProceed && !isSubmitting ? 'pointer' : 'not-allowed',
              opacity: canProceed && !isSubmitting ? 1 : 0.5
            }}
          >
            {isSubmitting ? 'Creating Campaign...' : (
              <>Finish <Check size={16} /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
