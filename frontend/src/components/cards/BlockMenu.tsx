/**
 * BlockMenu - Context menu for card/block operations
 * Feature: 004-create-a-tagging
 * Shows information level selector and basic operations
 */

import React, { useState, useRef, useEffect } from 'react';
import { PaintersEaselPalette } from '../PaintersEaselPalette';
import type { Card } from '../../../../shared/types/Card';

interface BlockMenuProps {
  card: Card;
  onClose: () => void;
  onLevelChange: (levelId: string) => void;
  onDelete: () => void;
  onTransformToPage: () => void;
  onTransformToDatabase: () => void;
  onTransformToText: () => void;
}

export function BlockMenu({
  card,
  onClose,
  onLevelChange,
  onDelete,
  onTransformToPage,
  onTransformToDatabase,
  onTransformToText,
}: BlockMenuProps) {
  const [activeSection, setActiveSection] = useState<'main' | 'level'>('main');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleLevelSelect = (levelId: string) => {
    onLevelChange(levelId);
    onClose();
  };

  return (
    <div className="block-menu" ref={menuRef}>
      {activeSection === 'main' && (
        <div className="menu-section">
          <button
            className="menu-item"
            onClick={() => setActiveSection('level')}
          >
            <span className="menu-icon">🎨</span>
            <span className="menu-label">Information Level</span>
            <span className="menu-shortcut">→</span>
          </button>

          {card.type === 'text' && (
            <>
              <button
                className="menu-item"
                onClick={() => {
                  onTransformToPage();
                  onClose();
                }}
              >
                <span className="menu-icon">📄</span>
                <span className="menu-label">Turn into Page</span>
              </button>

              <button
                className="menu-item"
                onClick={() => {
                  onTransformToDatabase();
                  onClose();
                }}
              >
                <span className="menu-icon">📊</span>
                <span className="menu-label">Turn into Database</span>
              </button>
            </>
          )}

          {card.type === 'page' && (
            <button
              className="menu-item"
              onClick={() => {
                onTransformToText();
                onClose();
              }}
            >
              <span className="menu-icon">📝</span>
              <span className="menu-label">Turn into Text</span>
            </button>
          )}

          <div className="menu-divider" />

          <button
            className="menu-item menu-item-danger"
            onClick={() => {
              if (window.confirm('Delete this block?')) {
                onDelete();
                onClose();
              }
            }}
          >
            <span className="menu-icon">🗑️</span>
            <span className="menu-label">Delete</span>
          </button>
        </div>
      )}

      {activeSection === 'level' && (
        <div className="menu-section">
          <button
            className="menu-back"
            onClick={() => setActiveSection('main')}
          >
            ← Back
          </button>
          <PaintersEaselPalette
            onSelect={handleLevelSelect}
            showManagement={false}
            currentLevelId={card.informationLevelId}
          />
        </div>
      )}

      <style>{`
        .block-menu {
          position: absolute;
          left: 0;
          top: 100%;
          margin-top: 4px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          z-index: 1000;
          min-width: 220px;
          overflow: hidden;
        }

        .menu-section {
          padding: 0.5rem;
        }

        .menu-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
          border: none;
          background: transparent;
          border-radius: 0.375rem;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.875rem;
          text-align: left;
          transition: background 0.1s;
        }

        .menu-item:hover {
          background: #f3f4f6;
        }

        .menu-item-danger:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        .menu-icon {
          font-size: 1rem;
          width: 20px;
          flex-shrink: 0;
        }

        .menu-label {
          flex: 1;
        }

        .menu-shortcut {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .menu-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 0.5rem 0;
        }

        .menu-back {
          width: 100%;
          padding: 0.5rem 0.75rem;
          margin-bottom: 0.5rem;
          border: none;
          background: #f3f4f6;
          border-radius: 0.375rem;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.875rem;
          text-align: left;
          transition: background 0.1s;
        }

        .menu-back:hover {
          background: #e5e7eb;
        }
      `}</style>
    </div>
  );
}
