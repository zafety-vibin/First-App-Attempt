/**
 * Step 2: Category Toggles
 * Feature: 016-create-a-campaign
 * T019: Enable/disable optional categories
 */

import React from 'react';
import { useWizard } from '../../contexts/WizardContext';
import { THEME_DESCRIPTORS } from '../../constants/themes';
import CategoryToggleRow from './CategoryToggleRow';

const MANDATORY_CATEGORIES = [
  'lore', 'world_rules', 'npcs', 'locations', 'factions',
  'session_prep', 'session_recaps', 'quests', 'player_characters',
  'custom_mechanics', 'items'
];

const OPTIONAL_CATEGORIES = [
  { internalName: 'planar_forces', defaultEnabled: true },
  { internalName: 'creatures', defaultEnabled: false }
];

export default function Step2CategoryToggles() {
  const { state, dispatch } = useWizard();

  const currentTheme = THEME_DESCRIPTORS.find(t => t.id === state.step1.selectedTheme);
  const labels = currentTheme?.labels || {};

  const handleToggle = (category: string) => {
    dispatch({ type: 'TOGGLE_CATEGORY', payload: category });
  };

  const enabledCount = state.step2.enabledCategories.size;

  return (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '0.5rem' }}>
        Configure Categories
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
        Choose which optional categories to enable for your campaign. Core categories are always enabled.
      </p>

      <div style={{
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        marginBottom: '1.5rem'
      }}>
        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#10b981' }}>
          {enabledCount} categories enabled
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Core Categories (Always Enabled)
        </div>
        {MANDATORY_CATEGORIES.map(cat => (
          <CategoryToggleRow
            key={cat}
            internalName={cat}
            displayName={(labels as any)[cat] || cat}
            enabled={true}
            disabled={true}
            onToggle={() => {}}
          />
        ))}

        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1rem' }}>
          Optional Categories
        </div>
        {OPTIONAL_CATEGORIES.map(opt => (
          <CategoryToggleRow
            key={opt.internalName}
            internalName={opt.internalName}
            displayName={(labels as any)[opt.internalName] || opt.internalName}
            enabled={state.step2.enabledCategories.has(opt.internalName)}
            disabled={false}
            onToggle={() => handleToggle(opt.internalName)}
          />
        ))}
      </div>
    </div>
  );
}
