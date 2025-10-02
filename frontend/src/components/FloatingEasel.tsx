/**
 * FloatingEasel - Bottom-left floating widget for selecting active information level
 * Feature: 004-create-a-tagging
 *
 * Acts as a "current brush" - new blocks created will use the selected level
 */

import React, { useState, useRef, useEffect } from 'react';
import { useInformationLevel } from '../contexts/InformationLevelContext';
import { InformationLevel } from '../../shared/types/InformationLevel';

export function FloatingEasel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const {
    levels,
    selectedLevelId,
    setSelectedLevelId,
    getLevelById,
  } = useInformationLevel();

  const activeLevelObject = getLevelById(selectedLevelId);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isExpanded]);

  const handleLevelSelect = (levelId: string) => {
    setSelectedLevelId(levelId);
    setIsExpanded(false);
  };

  return (
    <div className="floating-easel" ref={widgetRef}>
      {!isExpanded ? (
        // Collapsed state - small button
        <button
          className="easel-button"
          onClick={() => setIsExpanded(true)}
          title={`Active Level: ${activeLevelObject?.name || 'System'}`}
          style={{
            borderColor: activeLevelObject?.color || '#6B7280',
          }}
        >
          <div
            className="easel-button-dot"
            style={{ backgroundColor: activeLevelObject?.color || '#6B7280' }}
          />
          <span className="easel-button-icon">🎨</span>
        </button>
      ) : (
        // Expanded state - level palette
        <div className="easel-palette">
          <div className="easel-header">
            <span className="easel-title">Active Level</span>
            <button
              className="easel-close"
              onClick={() => setIsExpanded(false)}
            >
              ×
            </button>
          </div>

          <div className="easel-levels">
            {levels.map(level => (
              <button
                key={level.id}
                className={`easel-level-item ${selectedLevelId === level.id ? 'active' : ''}`}
                onClick={() => handleLevelSelect(level.id)}
                style={{
                  borderColor: level.color,
                  backgroundColor: selectedLevelId === level.id ? level.color + '20' : 'white',
                }}
              >
                <div
                  className="easel-level-dot"
                  style={{ backgroundColor: level.color }}
                />
                <span className="easel-level-name">{level.name}</span>
                {level.hierarchical && (
                  <span className="easel-level-lock" title="Hidden in Player View">
                    🔒
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="easel-hint">
            New blocks will use this level
          </div>
        </div>
      )}

      <style>{`
        .floating-easel {
          position: fixed;
          bottom: 24px;
          left: 24px;
          z-index: 1000;
        }

        .easel-button {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 3px solid;
          background: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: all 0.2s;
        }

        .easel-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .easel-button-dot {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid white;
        }

        .easel-button-icon {
          font-size: 24px;
        }

        .easel-palette {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          min-width: 240px;
          overflow: hidden;
        }

        .easel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .easel-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .easel-close {
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          color: #9ca3af;
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.1s;
        }

        .easel-close:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .easel-levels {
          padding: 8px;
          max-height: 320px;
          overflow-y: auto;
        }

        .easel-level-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          margin-bottom: 4px;
          border: 2px solid;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.875rem;
          font-weight: 500;
          text-align: left;
          transition: all 0.15s;
        }

        .easel-level-item:last-child {
          margin-bottom: 0;
        }

        .easel-level-item:hover {
          transform: translateX(4px);
        }

        .easel-level-item.active {
          font-weight: 600;
        }

        .easel-level-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .easel-level-name {
          flex: 1;
        }

        .easel-level-lock {
          font-size: 0.75rem;
          opacity: 0.6;
        }

        .easel-hint {
          padding: 8px 16px 12px;
          font-size: 0.75rem;
          color: #6b7280;
          text-align: center;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
