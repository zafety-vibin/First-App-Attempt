/**
 * RegionEditor Component
 * Feature: 021-create-a-geographic
 * Task: T026
 *
 * Modal for creating/editing faction territory regions.
 * Includes faction search, color picker, polygon vertex editor, and label input.
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import './RegionEditor.css';

export interface RegionEditorProps {
  /** Current region data (for editing) or initial values (for creating) */
  initialData?: {
    vertices: Array<{ x: number; y: number }>;
    faction_id?: string;
    color?: string;
    label?: string | null;
    z_order?: number;
  };
  /** Campaign ID for faction search */
  campaignId: string;
  /** Map ID for the region */
  mapId: string;
  /** Callback when save is clicked */
  onSave: (regionData: any) => void;
  /** Callback to close the editor */
  onClose: () => void;
}

// Color presets for faction regions
const REGION_COLOR_PRESETS = [
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Orange
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
];

const RegionEditor: React.FC<RegionEditorProps> = ({
  initialData,
  campaignId,
  mapId,
  onSave,
  onClose,
}) => {
  const [factionSearch, setFactionSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFaction, setSelectedFaction] = useState<any | null>(null);
  const [color, setColor] = useState<string>(initialData?.color || '#EF4444');
  const [label, setLabel] = useState<string>(initialData?.label || '');
  const [vertices, setVertices] = useState<Array<{ x: number; y: number }>>(
    initialData?.vertices || []
  );
  const [zOrder, setZOrder] = useState<number>(initialData?.z_order || 1);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Search for factions
   */
  useEffect(() => {
    if (!factionSearch.trim() || factionSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await apiClient.get('/factions', {
          params: {
            campaign_id: campaignId,
            search: factionSearch,
            limit: 10
          }
        });

        setSearchResults(response.data.data || []);
      } catch (err: any) {
        console.error('Faction search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [factionSearch, campaignId]);

  /**
   * Handle faction selection from search results
   */
  const handleFactionSelect = (faction: any) => {
    setSelectedFaction(faction);
    setFactionSearch(faction.name);
    setSearchResults([]);
    if (!label) {
      setLabel(`${faction.name} Territory`); // Auto-fill label
    }
  };

  /**
   * Handle save
   */
  const handleSave = async () => {
    if (!selectedFaction) {
      setError('Please select a faction');
      return;
    }

    if (vertices.length < 3) {
      setError('Region must have at least 3 vertices');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const regionData = {
        map_id: mapId,
        vertices,
        faction_id: selectedFaction.id,
        color: color,
        label: label.trim() || null,
        z_order: zOrder,
      };

      onSave(regionData);
    } catch (err: any) {
      setError(err.message || 'Failed to save region');
      setIsSaving(false);
    }
  };

  return (
    <div className="region-editor-overlay" onClick={onClose}>
      <div className="region-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="region-editor-header">
          <h3>{initialData ? 'Edit Region' : 'Add Faction Region'}</h3>
          <button className="region-editor-close" onClick={onClose}>×</button>
        </div>

        <div className="region-editor-content">
          {/* Vertices Display */}
          <div className="region-editor-field">
            <label>Polygon Vertices</label>
            <div className="region-editor-vertices">
              {vertices.length} vertices
              {vertices.length < 3 && (
                <span className="region-editor-vertices-warning">
                  (minimum 3 required)
                </span>
              )}
            </div>
            {vertices.length > 0 && (
              <div className="region-editor-vertices-list">
                {vertices.map((v, idx) => (
                  <div key={idx} className="region-editor-vertex">
                    {idx + 1}: ({v.x}, {v.y})
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Faction Search */}
          <div className="region-editor-field">
            <label>Faction *</label>
            <input
              type="text"
              value={factionSearch}
              onChange={(e) => setFactionSearch(e.target.value)}
              placeholder="Type to search factions..."
              className="region-editor-text-input"
            />
            {isSearching && <div className="region-editor-hint">Searching...</div>}
            {searchResults.length > 0 && (
              <div className="region-editor-search-results">
                {searchResults.map((faction) => (
                  <div
                    key={faction.id}
                    className="region-editor-search-result"
                    onClick={() => handleFactionSelect(faction)}
                  >
                    <div className="region-editor-search-result-name">{faction.name}</div>
                    {faction.description && (
                      <div className="region-editor-search-result-desc">
                        {faction.description.substring(0, 60)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {selectedFaction && (
              <div className="region-editor-selected-faction">
                ✓ Selected: {selectedFaction.name}
              </div>
            )}
          </div>

          {/* Color Picker */}
          <div className="region-editor-field">
            <label>Territory Color</label>
            <div className="region-editor-color-picker">
              {REGION_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  className={`region-editor-color-option ${color === preset ? 'selected' : ''}`}
                  style={{ background: preset }}
                  onClick={() => setColor(preset)}
                  title={preset}
                />
              ))}
              {/* Custom color input */}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="region-editor-color-custom"
                title="Custom color"
              />
            </div>
          </div>

          {/* Label Input */}
          <div className="region-editor-field">
            <label>Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Zhentarim Territory"
              className="region-editor-text-input"
              maxLength={100}
            />
          </div>

          {/* Z-Order (layer priority) */}
          <div className="region-editor-field">
            <label>Layer Priority</label>
            <input
              type="number"
              value={zOrder}
              onChange={(e) => setZOrder(parseInt(e.target.value) || 1)}
              min={1}
              max={100}
              className="region-editor-number-input"
            />
            <div className="region-editor-hint">
              Higher numbers appear on top of lower numbers
            </div>
          </div>

          {/* Error Display */}
          {error && <div className="region-editor-error">{error}</div>}
        </div>

        <div className="region-editor-footer">
          <button
            className="region-editor-button region-editor-button-secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="region-editor-button region-editor-button-primary"
            onClick={handleSave}
            disabled={!selectedFaction || vertices.length < 3 || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Region'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegionEditor;
