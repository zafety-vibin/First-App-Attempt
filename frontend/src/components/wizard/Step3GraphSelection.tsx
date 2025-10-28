/**
 * Step 3: Campaign Bible Preview
 * Feature: Campaign Bible Enhancement
 *
 * Informational step explaining the Campaign Bible that will be generated.
 * No user choices needed - Step 4 questionnaire is always shown.
 */

import React from 'react';

export default function Step3GraphSelection() {
  return (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '0.5rem' }}>
        Campaign Bible
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
        In the next step, you'll create your Campaign Bible - a governance document that establishes your campaign's tone, boundaries, and worldbuilding constants.
      </p>

      {/* Campaign Bible Info */}
      <div style={{
        background: 'rgba(251, 191, 36, 0.05)',
        border: '2px solid rgba(251, 191, 36, 0.3)',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#fbbf24' }}>
            📖 Campaign Bible
          </h4>
        </div>
        <p style={{ fontSize: '0.813rem', color: '#94a3b8', marginBottom: '1rem' }}>
          The bible establishes meta-level governance for your campaign:
        </p>

        <ul style={{ fontSize: '0.813rem', color: '#cbd5e1', lineHeight: '1.6', margin: 0, paddingLeft: '1.5rem' }}>
          <li><strong>Setting Identity</strong> - Genre, tone, technology, magic</li>
          <li><strong>Campaign Rules</strong> - Narrative tone, content boundaries, player agency</li>
          <li><strong>Worldbuilding Constants</strong> - History, religions, politics, economics</li>
        </ul>

        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: 'rgba(251, 191, 36, 0.1)',
          borderRadius: '6px',
          fontSize: '0.75rem',
          color: '#fbbf24'
        }}>
          💡 The bible is fully editable after wizard completion and accessible from the Settings sidebar
        </div>
      </div>

      {/* Knowledge Graphs Info */}
      <div style={{ fontSize: '0.813rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
        <strong>Knowledge Graphs</strong> (for in-world relationships) can be created later:
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: 0.6 }}>
        {[
          { name: 'Political-Web', desc: 'Faction alliances and conflicts' },
          { name: 'Geographical', desc: 'Location connections and routes' },
          { name: 'Campaign-Story', desc: 'Plot threads and narrative arcs' }
        ].map(graph => (
          <div
            key={graph.name}
            style={{
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px'
            }}
          >
            <div style={{ fontSize: '0.875rem', color: '#e2e8f0', marginBottom: '0.25rem' }}>{graph.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{graph.desc}</div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '8px',
        fontSize: '0.813rem',
        color: '#94a3b8'
      }}>
        <strong style={{ color: '#60a5fa' }}>What's the difference?</strong><br/>
        <strong>Campaign Bible</strong> = Meta-level governance (tone, boundaries, constants)<br/>
        <strong>Knowledge Graphs</strong> = In-world relationships (NPC connections, faction alliances)<br/>
        <strong>World Rules</strong> = In-lore mechanics (magic systems, custom combat rules)
      </div>
    </div>
  );
}
