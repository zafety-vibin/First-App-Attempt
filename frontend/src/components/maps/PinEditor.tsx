/**
 * PinEditor Component
 * Feature: 021-create-a-geographic
 * Task: T025
 *
 * Modal for creating/editing map pins.
 * Includes entity search, icon picker, color picker, and coordinate display.
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import './PinEditor.css';

export interface PinEditorProps {
  /** Current pin data (for editing) or initial values (for creating) */
  initialData?: {
    x: number;
    y: number;
    linked_entity_type?: 'location' | 'npc';
    linked_entity_id?: string;
    icon?: string | null;
    color?: string | null;
    label?: string | null;
  };
  /** Campaign ID for entity search */
  campaignId: string;
  /** Map ID for the pin */
  mapId: string;
  /** Callback when save is clicked */
  onSave: (pinData: any) => void;
  /** Callback to close the editor */
  onClose: () => void;
}

// Icon options (matching backend validation schema)
const ICON_OPTIONS = [
  { value: 'castle', label: '🏰 Castle', emoji: '🏰' },
  { value: 'city', label: '🏙️ City', emoji: '🏙️' },
  { value: 'town', label: '🏘️ Town', emoji: '🏘️' },
  { value: 'village', label: '🏡 Village', emoji: '🏡' },
  { value: 'dungeon', label: '⚔️ Dungeon', emoji: '⚔️' },
  { value: 'cave', label: '🕳️ Cave', emoji: '🕳️' },
  { value: 'mountain', label: '⛰️ Mountain', emoji: '⛰️' },
  { value: 'forest', label: '🌲 Forest', emoji: '🌲' },
  { value: 'desert', label: '🏜️ Desert', emoji: '🏜️' },
  { value: 'water', label: '💧 Water', emoji: '💧' },
  { value: 'landmark', label: '📍 Landmark', emoji: '📍' },
  { value: 'temple', label: '⛩️ Temple', emoji: '⛩️' },
  { value: 'tower', label: '🗼 Tower', emoji: '🗼' },
  { value: 'port', label: '⚓ Port', emoji: '⚓' },
  { value: 'bridge', label: '🌉 Bridge', emoji: '🌉' },
  { value: 'ruins', label: '🏛️ Ruins', emoji: '🏛️' },
  { value: 'camp', label: '⛺ Camp', emoji: '⛺' },
  { value: 'mine', label: '⛏️ Mine', emoji: '⛏️' },
  { value: 'farm', label: '🌾 Farm', emoji: '🌾' },
  { value: 'other', label: '📌 Other', emoji: '📌' },
];

// Color presets
const COLOR_PRESETS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Orange
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Dark Orange
];

const PinEditor: React.FC<PinEditorProps> = ({
  initialData,
  campaignId,
  mapId,
  onSave,
  onClose,
}) => {
  const [entityType, setEntityType] = useState<'location' | 'npc'>(
    initialData?.linked_entity_type || 'location'
  );
  const [entitySearch, setEntitySearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [icon, setIcon] = useState<string>(initialData?.icon || 'other');
  const [color, setColor] = useState<string>(initialData?.color || '#3B82F6');
  const [label, setLabel] = useState<string>(initialData?.label || '');
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Search for entities (locations or NPCs)
   */
  useEffect(() => {
    if (!entitySearch.trim() || entitySearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const endpoint = entityType === 'location' ? 'locations' : 'npcs';
        const response = await apiClient.get(`/${endpoint}`, {
          params: {
            campaign_id: campaignId,
            search: entitySearch,
            limit: 10
          }
        });

        setSearchResults(response.data.data || []);
      } catch (err: any) {
        console.error('Entity search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [entitySearch, entityType, campaignId]);

  /**
   * Handle entity selection from search results
   */
  const handleEntitySelect = (entity: any) => {
    setSelectedEntity(entity);
    setEntitySearch(entity.name);
    setSearchResults([]);
    if (!label) {
      setLabel(entity.name); // Auto-fill label
    }
  };

  /**
   * Handle save
   */
  const handleSave = async () => {
    // Entity linking is now optional - allow visual-only pins
    setIsSaving(true);
    setError(null);

    try {
      const pinData: any = {
        map_id: mapId,
        x: initialData!.x,
        y: initialData!.y,
        icon: icon || null,
        color: color || null,
        label: label.trim() || null,
      };

      // Only include entity linking if entity is selected
      if (selectedEntity) {
        pinData.linked_entity_type = entityType;
        pinData.linked_entity_id = selectedEntity.id;
      }

      onSave(pinData);
    } catch (err: any) {
      setError(err.message || 'Failed to save pin');
      setIsSaving(false);
    }
  };

  return (
    <div className="pin-editor-overlay" onClick={onClose}>
      <div className="pin-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pin-editor-header">
          <h3>{initialData ? 'Edit Pin' : 'Add Pin'}</h3>
          <button className="pin-editor-close" onClick={onClose}>×</button>
        </div>

        <div className="pin-editor-content">
          {/* Coordinates Display */}
          {initialData && (
            <div className="pin-editor-field">
              <label>Position</label>
              <div className="pin-editor-coordinates">
                X: {initialData.x}px, Y: {initialData.y}px
              </div>
            </div>
          )}

          {/* Entity Type Selector */}
          <div className="pin-editor-field">
            <label>Link To (Optional)</label>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value as 'location' | 'npc');
                setSelectedEntity(null);
                setEntitySearch('');
              }}
              className="pin-editor-select"
            >
              <option value="location">Location</option>
              <option value="npc">NPC</option>
            </select>
          </div>

          {/* Entity Search */}
          <div className="pin-editor-field">
            <label>Search {entityType === 'location' ? 'Location' : 'NPC'} (Optional)</label>
            <input
              type="text"
              value={entitySearch}
              onChange={(e) => setEntitySearch(e.target.value)}
              placeholder={`Type to search ${entityType === 'location' ? 'locations' : 'NPCs'}...`}
              className="pin-editor-text-input"
            />
            {isSearching && <div className="pin-editor-hint">Searching...</div>}
            {searchResults.length > 0 && (
              <div className="pin-editor-search-results">
                {searchResults.map((entity) => (
                  <div
                    key={entity.id}
                    className="pin-editor-search-result"
                    onClick={() => handleEntitySelect(entity)}
                  >
                    <div className="pin-editor-search-result-name">{entity.name}</div>
                    {entity.description && (
                      <div className="pin-editor-search-result-desc">{entity.description.substring(0, 60)}...</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {selectedEntity && (
              <div className="pin-editor-selected-entity">
                ✓ Selected: {selectedEntity.name}
              </div>
            )}
          </div>

          {/* Icon Picker */}
          <div className="pin-editor-field">
            <label>Icon</label>
            <div className="pin-editor-icon-grid">
              {ICON_OPTIONS.map((iconOption) => (
                <button
                  key={iconOption.value}
                  className={`pin-editor-icon-option ${icon === iconOption.value ? 'selected' : ''}`}
                  onClick={() => setIcon(iconOption.value)}
                  title={iconOption.label}
                >
                  {iconOption.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="pin-editor-field">
            <label>Color</label>
            <div className="pin-editor-color-picker">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  className={`pin-editor-color-option ${color === preset ? 'selected' : ''}`}
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
                className="pin-editor-color-custom"
                title="Custom color"
              />
            </div>
          </div>

          {/* Label Input */}
          <div className="pin-editor-field">
            <label>Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Pin label (optional)"
              className="pin-editor-text-input"
              maxLength={50}
            />
          </div>

          {/* Error Display */}
          {error && <div className="pin-editor-error">{error}</div>}
        </div>

        <div className="pin-editor-footer">
          <button
            className="pin-editor-button pin-editor-button-secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="pin-editor-button pin-editor-button-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Pin'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinEditor;
