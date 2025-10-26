/**
 * Step 1: Style Selection
 * Feature: 016-create-a-campaign
 * T018: Theme selection with card grid
 */

import React from 'react';
import { useWizard } from '../../contexts/WizardContext';
import { THEME_DESCRIPTORS } from '../../constants/themes';
import ThemeCard from './ThemeCard';

export default function Step1StyleSelection() {
  const { state, dispatch } = useWizard();

  const handleSelectTheme = (themeId: string) => {
    dispatch({ type: 'SELECT_THEME', payload: themeId as any });
  };

  const handleCustomLabelChange = (category: string, value: string) => {
    const newLabels = { ...state.step1.customLabels, [category]: value };
    dispatch({ type: 'SET_CUSTOM_LABELS', payload: newLabels as any });
  };

  return (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '1rem' }}>
        Choose Your Campaign Style
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
        Select a theme to automatically apply thematic naming to your categories, or choose Custom to define your own names.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {THEME_DESCRIPTORS.map(theme => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            selected={state.step1.selectedTheme === theme.id}
            onClick={() => handleSelectTheme(theme.id)}
          />
        ))}
      </div>

      {/* Custom theme: show category name inputs */}
      {state.step1.selectedTheme === 'custom' && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '1rem' }}>
            Custom Category Names
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {Object.keys(state.step1.customLabels || {}).map(category => (
              <div key={category}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'capitalize' }}>
                  {category.replace(/_/g, ' ')}
                </label>
                <input
                  type="text"
                  value={(state.step1.customLabels as any)?.[category] || ''}
                  onChange={(e) => handleCustomLabelChange(category, e.target.value)}
                  maxLength={50}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.875rem'
                  }}
                />
                <span style={{ fontSize: '0.688rem', color: '#6b7280' }}>
                  {((state.step1.customLabels as any)?.[category] || '').length}/50
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
