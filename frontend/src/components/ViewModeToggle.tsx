/**
 * ViewModeToggle - Eye icon toggle for DM/Player views
 * Feature: 004-create-a-tagging (Updated for Feature 015)
 *
 * Eye open = DM View (shows all content including secrets)
 * Eye closed = Player View (hides DM-only content)
 */

import React from 'react';
import { useViewMode } from '../contexts/ViewModeContext';

export function ViewModeToggle() {
  const { viewMode, toggleViewMode } = useViewMode();

  const isDMView = viewMode === 'dm_view';

  return (
    <button
      onClick={toggleViewMode}
      className="view-mode-toggle-icon"
      title={isDMView ? 'DM View (Click to switch to Player View)' : 'Player View (Click to switch to DM View)'}
      aria-label={isDMView ? 'Switch to Player View' : 'Switch to DM View'}
    >
      {isDMView ? (
        // Eye Open - DM View (shows secrets)
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="eye-icon eye-open"
        >
          <path
            d="M12 5C7 5 2.73 8.11 1 12.5C2.73 16.89 7 20 12 20C17 20 21.27 16.89 23 12.5C21.27 8.11 17 5 12 5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="12"
            cy="12.5"
            r="3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        // Eye Closed - Player View (hides secrets)
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="eye-icon eye-closed"
        >
          <path
            d="M3 3L21 21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.584 10.587C10.2087 10.9624 9.99778 11.4708 9.99756 12.0013C9.99734 12.5318 10.2078 13.0404 10.5828 13.416C10.9578 13.7916 11.4661 14.0027 11.9966 14.0029C12.5271 14.0032 13.0356 13.7927 13.4112 13.4177"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.363 5.365C10.2204 5.11972 11.1082 4.99684 12 5C17 5 21.27 8.11 23 12.5C22.3203 14.0767 21.3479 15.5136 20.127 16.74"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.61 6.61C4.62125 7.96462 2.99219 9.77541 1.87 11.887C1.55 12.487 1.55 13.213 1.87 13.813C3.6 17.203 7.4 20 12 20C13.9587 20.0059 15.8866 19.4858 17.59 18.49"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      <style>{`
        .view-mode-toggle-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          padding: 10px;
          border: 2px solid transparent;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .view-mode-toggle-icon:hover {
          border-color: var(--color-primary, #4a90e2);
          box-shadow: 0 2px 8px rgba(74, 144, 226, 0.2);
          transform: translateY(-1px);
        }

        .view-mode-toggle-icon:focus {
          outline: 2px solid var(--color-primary, #4a90e2);
          outline-offset: 2px;
        }

        .view-mode-toggle-icon:active {
          transform: translateY(0);
        }

        .eye-icon {
          display: block;
        }

        /* DM View - Eye Open - Green tint */
        .eye-open {
          color: #10b981;
        }

        .view-mode-toggle-icon:hover .eye-open {
          color: #059669;
        }

        /* Player View - Eye Closed - Blue tint */
        .eye-closed {
          color: #6366f1;
        }

        .view-mode-toggle-icon:hover .eye-closed {
          color: #4f46e5;
        }
      `}</style>
    </button>
  );
}
