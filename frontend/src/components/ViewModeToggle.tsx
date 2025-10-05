/**
 * ViewModeToggle - Toggle button to switch between DM and Player views
 * Feature: 004-create-a-tagging
 * Task: T028
 */

import React from 'react';
import { useViewMode } from '../contexts/ViewModeContext';

export function ViewModeToggle() {
  const { viewMode, toggleViewMode, showsHierarchical } = useViewMode();

  return (
    <div className="view-mode-toggle">
      <button
        onClick={toggleViewMode}
        className={`toggle-button ${viewMode}`}
        title={`Current view: ${viewMode === 'dm' ? 'DM' : 'Player'}`}
      >
        <span className="view-mode-icon">
          {viewMode === 'dm' ? '🎲' : '👁️'}
        </span>
        <span className="view-mode-label">
          {viewMode === 'dm' ? 'DM View' : 'Player View'}
        </span>
        {!showsHierarchical && (
          <span className="filtered-indicator" title="Hierarchical content is hidden">
            🔒
          </span>
        )}
      </button>

      <style>{`
        .view-mode-toggle {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 1000;
          transition: right 0.3s ease-in-out;
        }

        body[data-sidebar-open] .view-mode-toggle {
          right: 420px; /* 400px sidebar + 20px margin */
        }

        .toggle-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.5rem;
          background: white;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .toggle-button:hover {
          border-color: #3b82f6;
          background: #f0f9ff;
        }

        .toggle-button.dm {
          border-color: #10b981;
          color: #065f46;
        }

        .toggle-button.player {
          border-color: #6366f1;
          color: #4338ca;
        }

        .view-mode-icon {
          font-size: 1.25rem;
          line-height: 1;
        }

        .view-mode-label {
          font-weight: 600;
        }

        .filtered-indicator {
          font-size: 0.875rem;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
