/**
 * Theme Card
 * Feature: 016-create-a-campaign
 * T022: Individual theme card component
 */

import React from 'react';
import { Check } from 'lucide-react';
import { ThemeDescriptor } from '../../constants/themes';

interface ThemeCardProps {
  theme: ThemeDescriptor;
  selected: boolean;
  onClick: () => void;
}

export default function ThemeCard({ theme, selected, onClick }: ThemeCardProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      aria-selected={selected}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      style={{
        position: 'relative',
        padding: '1.25rem',
        background: selected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
        border: selected ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          background: 'rgba(255, 255, 255, 0.1)',
          borderColor: selected ? '#10b981' : 'rgba(255, 255, 255, 0.2)'
        }
      }}
    >
      {selected && (
        <div style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          width: '24px',
          height: '24px',
          background: '#10b981',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Check size={14} color="#fff" />
        </div>
      )}

      <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '0.5rem' }}>
        {theme.name}
      </h4>
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem', lineHeight: '1.4' }}>
        {theme.description}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
        {theme.previewCategories.map(cat => (
          <span
            key={cat}
            style={{
              fontSize: '0.688rem',
              padding: '0.25rem 0.5rem',
              background: 'rgba(168, 85, 247, 0.2)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '4px',
              color: '#c084fc'
            }}
          >
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
}
