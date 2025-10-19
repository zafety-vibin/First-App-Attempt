/**
 * Step 3: Knowledge Graph Selection
 * Feature: 016-create-a-campaign
 * T020: Graph setup choices
 */

import React from 'react';
import { useWizard } from '../../contexts/WizardContext';

export default function Step3GraphSelection() {
  const { state, dispatch } = useWizard();

  const handleChoiceChange = (choice: 'setup_now' | 'setup_later') => {
    dispatch({ type: 'SELECT_GRAPH_CHOICE', payload: choice });
  };

  return (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '0.5rem' }}>
        Knowledge Graphs
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
        World-Foundations graph helps AI tools understand your world's core rules. Other graphs can be set up later.
      </p>

      {/* World-Foundations (recommended) */}
      <div style={{
        background: 'rgba(16, 185, 129, 0.05)',
        border: '2px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#10b981' }}>
            World-Foundations
          </h4>
          <span style={{
            fontSize: '0.688rem',
            padding: '0.125rem 0.5rem',
            background: '#10b981',
            color: '#fff',
            borderRadius: '4px',
            fontWeight: '600'
          }}>
            RECOMMENDED
          </span>
        </div>
        <p style={{ fontSize: '0.813rem', color: '#94a3b8', marginBottom: '1rem' }}>
          Define magic systems, technology levels, cosmology, and social structures
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            background: state.step3.worldFoundationsChoice === 'setup_now' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
            border: state.step3.worldFoundationsChoice === 'setup_now' ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            cursor: 'pointer'
          }}>
            <input
              type="radio"
              name="worldFoundations"
              checked={state.step3.worldFoundationsChoice === 'setup_now'}
              onChange={() => handleChoiceChange('setup_now')}
              style={{ width: '18px', height: '18px' }}
            />
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#e2e8f0' }}>Set up now</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Answer 4 quick questions (next step)</div>
            </div>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            background: state.step3.worldFoundationsChoice === 'setup_later' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
            border: state.step3.worldFoundationsChoice === 'setup_later' ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            cursor: 'pointer'
          }}>
            <input
              type="radio"
              name="worldFoundations"
              checked={state.step3.worldFoundationsChoice === 'setup_later'}
              onChange={() => handleChoiceChange('setup_later')}
              style={{ width: '18px', height: '18px' }}
            />
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#e2e8f0' }}>Set up later</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Skip questionnaire, configure manually</div>
            </div>
          </label>
        </div>
      </div>

      {/* Other graphs (informational only) */}
      <div style={{ fontSize: '0.813rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
        Other graphs can be set up after wizard completion:
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: 0.5 }}>
        {['Political-Web', 'Geographical', 'Campaign-Story'].map(graph => (
          <div
            key={graph}
            style={{
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <input type="checkbox" disabled checked={false} style={{ width: '18px', height: '18px' }} />
            <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{graph}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
