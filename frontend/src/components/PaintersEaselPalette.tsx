/**
 * PaintersEaselPalette - Color palette for selecting information levels
 * Feature: 004-create-a-tagging
 * Task: T029
 */

import React, { useState } from 'react';
import { useInformationLevel } from '../contexts/InformationLevelContext';
import { InformationLevel } from '../../shared/types/InformationLevel';

interface PaintersEaselPaletteProps {
  onSelect?: (levelId: string) => void;
  showManagement?: boolean;
}

export function PaintersEaselPalette({ onSelect, showManagement = false }: PaintersEaselPaletteProps) {
  const {
    levels,
    selectedLevelId,
    setSelectedLevelId,
    getDefaultLevels,
    getCustomLevels,
  } = useInformationLevel();

  const [showCustomForm, setShowCustomForm] = useState(false);

  const defaultLevels = getDefaultLevels();
  const customLevels = getCustomLevels();

  const handleSelect = (levelId: string) => {
    setSelectedLevelId(levelId);
    if (onSelect) {
      onSelect(levelId);
    }
  };

  return (
    <div className="painters-easel-palette">
      <div className="palette-section">
        <h4 className="section-title">Default Levels</h4>
        <div className="level-grid">
          {defaultLevels.map(level => (
            <LevelButton
              key={level.id}
              level={level}
              isSelected={selectedLevelId === level.id}
              onSelect={() => handleSelect(level.id)}
            />
          ))}
        </div>
      </div>

      {customLevels.length > 0 && (
        <div className="palette-section">
          <h4 className="section-title">Custom Levels</h4>
          <div className="level-grid">
            {customLevels.map(level => (
              <LevelButton
                key={level.id}
                level={level}
                isSelected={selectedLevelId === level.id}
                onSelect={() => handleSelect(level.id)}
                showManagement={showManagement}
              />
            ))}
          </div>
        </div>
      )}

      {showManagement && (
        <div className="palette-section">
          <button
            className="add-custom-button"
            onClick={() => setShowCustomForm(!showCustomForm)}
          >
            + Add Custom Level
          </button>
        </div>
      )}

      <style>{`
        .painters-easel-palette {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
          min-width: 200px;
        }

        .palette-section {
          margin-bottom: 1rem;
        }

        .palette-section:last-child {
          margin-bottom: 0;
        }

        .section-title {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          color: #6b7280;
          margin: 0 0 0.5rem 0;
        }

        .level-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
        }

        .add-custom-button {
          width: 100%;
          padding: 0.5rem;
          border: 2px dashed #d1d5db;
          border-radius: 0.375rem;
          background: transparent;
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-custom-button:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          background: #f0f9ff;
        }
      `}</style>
    </div>
  );
}

interface LevelButtonProps {
  level: InformationLevel;
  isSelected: boolean;
  onSelect: () => void;
  showManagement?: boolean;
}

function LevelButton({ level, isSelected, onSelect, showManagement = false }: LevelButtonProps) {
  return (
    <button
      className={`level-button ${isSelected ? 'selected' : ''} ${level.hierarchical ? 'hierarchical' : ''}`}
      onClick={onSelect}
      title={`${level.name}${level.hierarchical ? ' (Hierarchical - hidden in Player View)' : ''}`}
      style={{
        borderColor: level.color,
        backgroundColor: isSelected ? level.color + '20' : 'transparent',
      }}
    >
      <div
        className="color-dot"
        style={{ backgroundColor: level.color }}
      />
      <span className="level-name">{level.name}</span>
      {level.hierarchical && (
        <span className="hierarchical-icon" title="Hierarchical">
          🔒
        </span>
      )}

      <style>{`
        .level-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border: 2px solid;
          border-radius: 0.375rem;
          background: transparent;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.75rem;
          font-weight: 500;
          transition: all 0.2s;
          text-align: left;
        }

        .level-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .level-button.selected {
          font-weight: 600;
        }

        .color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .level-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .hierarchical-icon {
          font-size: 0.75rem;
          opacity: 0.6;
        }
      `}</style>
    </button>
  );
}
