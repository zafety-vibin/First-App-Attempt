/**
 * Wizard Progress
 * Feature: 016-create-a-campaign
 * T016: Step progress indicator
 */

import React from 'react';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
}

export default function WizardProgress({ currentStep, totalSteps }: WizardProgressProps) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.5rem'
      }}>
        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#e2e8f0' }}>
          Step {currentStep} of {totalSteps}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          {Math.round(percentage)}% complete
        </span>
      </div>
      <div style={{
        width: '100%',
        height: '8px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
          transition: 'width 0.3s ease-in-out',
          borderRadius: '4px'
        }} role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label="Wizard progress" />
      </div>
    </div>
  );
}
