import React, { useState, useEffect, useMemo } from 'react';
import { CategoryName } from '../../contexts/SidebarContext';
import { useCategory } from '../../hooks/useCategory';
import './RelationshipSelector.css';

export interface RelationshipSelectorProps {
  label: string;
  category: CategoryName;
  campaignId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  error?: string;
}

/**
 * Searchable relationship selector for foreign key and many-to-many relations
 * Usage: <RelationshipSelector label="Faction" category="factions" campaignId={id} selectedIds={[factionId]} onChange={setFactionId} />
 */
export const RelationshipSelector: React.FC<RelationshipSelectorProps> = ({
  label,
  category,
  campaignId,
  selectedIds,
  onChange,
  multiple = false,
  error,
}) => {
  const [searchText, setSearchText] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch entities from category
  const { entities, loading } = useCategory<any>(category, campaignId, { autoFetch: true });

  const selectorId = `relationship-selector-${category}`;
  const errorId = `${selectorId}-error`;
  const hasError = Boolean(error);

  // Filter entities by search text
  const filteredEntities = useMemo(() => {
    if (!searchText) return entities;
    const lowerSearch = searchText.toLowerCase();
    return entities.filter((entity) =>
      entity.name?.toLowerCase().includes(lowerSearch)
    );
  }, [entities, searchText]);

  // Get selected entities for display
  const selectedEntities = useMemo(() => {
    return entities.filter((entity) => selectedIds.includes(entity.id));
  }, [entities, selectedIds]);

  const handleSelect = (entityId: string) => {
    if (multiple) {
      if (selectedIds.includes(entityId)) {
        // Remove if already selected
        onChange(selectedIds.filter((id) => id !== entityId));
      } else {
        // Add to selection
        onChange([...selectedIds, entityId]);
      }
    } else {
      // Single selection
      onChange([entityId]);
      setIsOpen(false);
    }
  };

  const handleRemove = (entityId: string) => {
    onChange(selectedIds.filter((id) => id !== entityId));
  };

  const handleClear = () => {
    onChange([]);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.relationship-selector-wrapper')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relationship-selector-wrapper">
      <label htmlFor={selectorId} className="relationship-selector-label">
        {label}
      </label>

      {/* Selected chips (multiple mode) */}
      {multiple && selectedEntities.length > 0 && (
        <div className="relationship-selector-chips">
          {selectedEntities.map((entity) => (
            <span key={entity.id} className="relationship-chip">
              {entity.name}
              <button
                type="button"
                onClick={() => handleRemove(entity.id)}
                className="relationship-chip-remove"
                aria-label={`Remove ${entity.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input and dropdown */}
      <div className="relationship-selector-input-wrapper">
        <input
          id={selectorId}
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={`Search ${category.replace(/_/g, ' ')}...`}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className={`relationship-selector-input ${hasError ? 'relationship-selector-input-error' : ''}`}
        />
        {!multiple && selectedEntities.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="relationship-selector-clear"
            aria-label="Clear selection"
          >
            ×
          </button>
        )}

        {/* Dropdown menu */}
        {isOpen && (
          <div className="relationship-selector-dropdown">
            {loading ? (
              <div className="relationship-selector-loading">Loading...</div>
            ) : filteredEntities.length === 0 ? (
              <div className="relationship-selector-empty">No results found</div>
            ) : (
              <ul className="relationship-selector-list">
                {filteredEntities.map((entity) => {
                  const isSelected = selectedIds.includes(entity.id);
                  return (
                    <li key={entity.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(entity.id)}
                        className={`relationship-selector-option ${isSelected ? 'relationship-selector-option-selected' : ''}`}
                      >
                        {multiple && (
                          <span className="relationship-selector-checkbox">
                            {isSelected && '✓'}
                          </span>
                        )}
                        {entity.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Single selection display */}
      {!multiple && selectedEntities.length > 0 && (
        <div className="relationship-selector-single">
          <span className="relationship-selector-single-name">
            {selectedEntities[0].name}
          </span>
        </div>
      )}

      {hasError && (
        <span id={errorId} className="relationship-selector-error-message" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
