import React, { useState } from 'react';
import { FilterState } from '../../hooks/useSearchFilter';
import './FilterPanel.css';

export interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  availableTags?: string[];
  className?: string;
}

/**
 * Collapsible filter controls for core_status, player_knowledge, tags
 * Shows active filter count badge and "Clear Filters" button
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  availableTags = [],
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const coreStatusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
    { value: 'draft', label: 'Draft' },
  ];

  const playerKnowledgeOptions = [
    { value: 'freely_accessible', label: 'Freely Accessible' },
    { value: 'common_knowledge', label: 'Common Knowledge' },
    { value: 'player_knowledge', label: 'Player Knowledge' },
    { value: 'dm_only', label: 'DM Only' },
  ];

  // Count active filters
  const activeFilterCount =
    filters.coreStatus.length + filters.playerKnowledge.length + filters.tags.length;

  const handleCoreStatusChange = (value: string) => {
    const newValues = filters.coreStatus.includes(value)
      ? filters.coreStatus.filter((v) => v !== value)
      : [...filters.coreStatus, value];
    onChange({ ...filters, coreStatus: newValues });
  };

  const handlePlayerKnowledgeChange = (value: string) => {
    const newValues = filters.playerKnowledge.includes(value)
      ? filters.playerKnowledge.filter((v) => v !== value)
      : [...filters.playerKnowledge, value];
    onChange({ ...filters, playerKnowledge: newValues });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onChange({ ...filters, tags: newTags });
  };

  const handleClearFilters = () => {
    onChange({
      coreStatus: [],
      playerKnowledge: [],
      tags: [],
      customFilters: {},
    });
  };

  return (
    <div className={`filter-panel ${className}`}>
      <button
        type="button"
        className="filter-panel-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls="filter-panel-content"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M3 4h14M6 8h8M9 12h2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="filter-panel-badge" aria-label={`${activeFilterCount} active filters`}>
            {activeFilterCount}
          </span>
        )}
        <svg
          className={`filter-panel-arrow ${isExpanded ? 'filter-panel-arrow-expanded' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isExpanded && (
        <div id="filter-panel-content" className="filter-panel-content">
          {/* Core Status Filter */}
          <div className="filter-section">
            <h4 className="filter-section-title">Status</h4>
            <div className="filter-checkboxes">
              {coreStatusOptions.map((option) => (
                <label key={option.value} className="filter-checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.coreStatus.includes(option.value)}
                    onChange={() => handleCoreStatusChange(option.value)}
                    className="filter-checkbox"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Player Knowledge Filter */}
          <div className="filter-section">
            <h4 className="filter-section-title">Player Knowledge</h4>
            <div className="filter-checkboxes">
              {playerKnowledgeOptions.map((option) => (
                <label key={option.value} className="filter-checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.playerKnowledge.includes(option.value)}
                    onChange={() => handlePlayerKnowledgeChange(option.value)}
                    className="filter-checkbox"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <div className="filter-section">
              <h4 className="filter-section-title">Tags</h4>
              <div className="filter-tags">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`filter-tag-chip ${
                      filters.tags.includes(tag) ? 'filter-tag-chip-active' : ''
                    }`}
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                    {filters.tags.includes(tag) && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M9 3L3 9M3 3l6 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && (
            <div className="filter-panel-actions">
              <button
                type="button"
                className="filter-panel-clear"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
