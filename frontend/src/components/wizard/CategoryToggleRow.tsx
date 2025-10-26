/**
 * Category Toggle Row
 * Feature: 016-create-a-campaign
 * T023: Single category toggle with switch
 */

import React from 'react';
import * as Switch from '@radix-ui/react-switch';
import * as Tooltip from '@radix-ui/react-tooltip';

interface CategoryToggleRowProps {
  internalName: string;
  displayName: string;
  enabled: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export default function CategoryToggleRow({
  internalName,
  displayName,
  enabled,
  disabled,
  onToggle
}: CategoryToggleRowProps) {
  const switchElement = (
    <Switch.Root
      checked={enabled}
      onCheckedChange={onToggle}
      disabled={disabled}
      style={{
        width: '44px',
        height: '24px',
        background: enabled ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        position: 'relative',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1
      }}
      aria-label={`Toggle ${displayName}`}
      aria-disabled={disabled}
    >
      <Switch.Thumb style={{
        display: 'block',
        width: '18px',
        height: '18px',
        background: '#fff',
        borderRadius: '50%',
        transition: 'transform 0.2s',
        transform: enabled ? 'translateX(22px)' : 'translateX(3px)',
        marginTop: '2px'
      }} />
    </Switch.Root>
  );

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.75rem 1rem',
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.05)'
    }}>
      <span style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>{displayName}</span>

      {disabled ? (
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div>{switchElement}</div>
            </Tooltip.Trigger>
            <Tooltip.Content
              style={{
                background: 'rgba(0, 0, 0, 0.9)',
                color: '#fff',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                maxWidth: '200px'
              }}
            >
              Core category cannot be disabled
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      ) : (
        switchElement
      )}
    </div>
  );
}
