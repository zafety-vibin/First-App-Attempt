/**
 * Graph Node Editor Dialog
 * Create/Edit nodes in Political-Web and other knowledge graphs
 * Based on POLITICAL_WEB_GUIDE.md principles
 */

import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus, Trash2, Info } from 'lucide-react';
import { graphService } from '../../services/graphService';
import { GraphNode } from '../../types/graph';

interface GraphNodeEditorDialogProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  graphId: string;
  graphType: string; // 'Political-Web', 'World-Foundations', etc.
  node?: GraphNode; // If editing existing node
  onSave: () => void; // Callback to refresh graph
}

// Node types from POLITICAL_WEB_GUIDE.md (Updated hierarchy)
const NODE_TYPES_BY_GRAPH: Record<string, string[]> = {
  'Political-Web': [
    // NPC Hierarchy (Ring placement order)
    'NPC:leader',      // Ring 2: 125-150px (faction leaders, BBEGs)
    'NPC:lieutenant',  // Ring 2.5: 150-200px (second-in-command, advisors)
    'NPC:minor',       // Ring 3: 200-250px (common members, shopkeepers)
    'NPC:mentioned',   // Ring 3: 200-250px (STM, not yet met, name-dropped)
    'PC',              // Ring 0: Party members

    // Faction Types (Ring 1: 75-125px)
    'Faction:political',
    'Faction:military',
    'Faction:criminal',
    'Faction:ideological',
    'Organization:hierarchy',
    'Organization:alliance',

    // Special Types
    'neutral',          // Unaffiliated faction (no metaball)
    'adventuring_group' // The Party
  ],
  'World-Foundations': [
    'Magic System',
    'Deity',
    'Plane of Existence',
    'Species',
    'Fundamental Rule',
    'Cosmology Concept',
    'Historical Era'
  ],
  'Geographical': [
    'Continent',
    'Region',
    'City',
    'Town',
    'District',
    'Landmark',
    'Dungeon',
    'Wilderness Area'
  ],
  'Campaign-Story': [
    'Story Thread',
    'Event',
    'Quest',
    'Character Arc',
    'Plot Point',
    'Session Milestone'
  ]
};

const GraphNodeEditorDialog: React.FC<GraphNodeEditorDialogProps> = ({
  open,
  onClose,
  campaignId,
  graphId,
  graphType,
  node,
  onSave
}) => {
  const isEdit = !!node;

  // Form state
  const [nodeType, setNodeType] = useState(node?.type || '');
  const [name, setName] = useState(node?.name || '');
  const [faction, setFaction] = useState(node?.attributes?.faction || '');
  const [color, setColor] = useState(node?.attributes?.color || '#6b7280');
  const [role, setRole] = useState(node?.attributes?.role || '');
  const [isFactionNode, setIsFactionNode] = useState(node?.attributes?.is_faction_node || false);
  const [observations, setObservations] = useState<string[]>(
    node?.observations?.map(o => o.text) || ['']
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nodeTypes = NODE_TYPES_BY_GRAPH[graphType] || NODE_TYPES_BY_GRAPH['Political-Web'];

  // Faction colors from FACTION_MAPPING
  const FACTION_COLORS: Record<string, string> = {
    'Nine Arcane Writs': '#a855f7',
    'Mechanist Order Command Structure': '#71717a',
    'Chrome Bishop Proxies': '#8b5cf6',
    'Guild of the Writless': '#f59e0b',
    "Merchant's Guild": '#fb923c',
    'The Party': '#10b981',
    'Unaffiliated': '#6b7280'
  };

  // Reset form when node prop changes or dialog opens
  useEffect(() => {
    if (open) {
      console.log('Dialog opened, node:', node);
      // Backend returns node_type, not type - check both
      const nodeTypeValue = (node as any)?.node_type || node?.type || '';
      console.log('Node type value:', nodeTypeValue);
      setNodeType(nodeTypeValue);
      setName(node?.name || '');
      setFaction(node?.attributes?.faction || '');
      setColor(node?.attributes?.color || '#6b7280');
      setRole(node?.attributes?.role || '');
      setIsFactionNode(node?.attributes?.is_faction_node || false);
      setObservations(node?.observations?.map(o => o.text) || ['']);
      setError(null);
    }
  }, [open, node]);

  // Update color when faction changes
  const handleFactionChange = (newFaction: string) => {
    setFaction(newFaction);
    // Auto-update color to match faction
    if (FACTION_COLORS[newFaction]) {
      setColor(FACTION_COLORS[newFaction]);
    }
  };

  const handleAddObservation = () => {
    setObservations([...observations, '']);
  };

  const handleRemoveObservation = (index: number) => {
    setObservations(observations.filter((_, i) => i !== index));
  };

  const handleObservationChange = (index: number, value: string) => {
    const updated = [...observations];
    updated[index] = value;
    setObservations(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeType || !name.trim()) {
      setError('Node type and name are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const now = Math.floor(Date.now() / 1000);

      // Build attributes - MERGE with existing when editing to avoid clobbering
      const attributes: any = isEdit && node?.attributes ? { ...node.attributes } : {};

      // Update only the fields from the form
      if (faction) attributes.faction = faction;
      if (color) attributes.color = color;
      if (role) attributes.role = role;
      if (isFactionNode) {
        attributes.is_faction_node = true;
        if (!attributes.member_count) attributes.member_count = 0;
      }

      const nodeData: any = {
        node_type: nodeType, // Backend expects node_type, not type
        name: name.trim(),
        attributes, // Merged attributes
        observations: observations
          .filter(text => text.trim())
          .map(text => ({
            text: text.trim(),
            created_at: now,
            last_accessed: now
          }))
      };

      console.log('Saving node:', isEdit ? 'UPDATE' : 'CREATE', nodeData);

      if (isEdit && node) {
        // Update existing node
        const result = await graphService.updateNode(campaignId, graphId, node.id, nodeData);
        console.log('Update result:', result);
      } else {
        // Create new node
        const result = await graphService.createNode(campaignId, graphId, nodeData);
        console.log('Create result:', result);
      }

      onSave();
      onClose();
    } catch (err: any) {
      console.error('Failed to save node:', err);
      setError(err.response?.data?.error || 'Failed to save node');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = nodeType && name.trim();

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
          <Dialog.Title className="dialog-title">
            {isEdit ? 'Edit Node' : 'Create Node'}
          </Dialog.Title>
          <Dialog.Description className="dialog-description">
            {graphType === 'Political-Web'
              ? 'Add NPCs, factions, or organizations to your political network'
              : `Add a node to ${graphType} graph`
            }
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="graph-node-form">
            {/* Node Type */}
            <div className="form-field">
              <label htmlFor="nodeType">
                Node Type <span className="required">*</span>
              </label>
              <select
                id="nodeType"
                value={nodeType}
                onChange={(e) => setNodeType(e.target.value)}
                required
                className="select-input"
              >
                <option value="">Select type...</option>
                {nodeTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <small className="field-hint">
                Use hierarchical types like "NPC:major" for better filtering
              </small>
            </div>

            {/* Name */}
            <div className="form-field">
              <label htmlFor="name">
                Name <span className="required">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-input"
                placeholder="e.g., Galik Emberfuse"
              />
            </div>

            {/* Political-Web specific fields */}
            {graphType === 'Political-Web' && (
              <>
                {/* Faction Node Checkbox */}
                <div className="form-field">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isFactionNode}
                      onChange={(e) => setIsFactionNode(e.target.checked)}
                    />
                    <span>This is a faction node (not an NPC)</span>
                  </label>
                  <small className="field-hint">
                    Check this for organizations, factions, or The Party
                  </small>
                </div>

                {/* Faction Assignment (for NPCs) */}
                {!isFactionNode && (
                  <div className="form-field">
                    <label htmlFor="faction">Faction</label>
                    <select
                      id="faction"
                      value={faction}
                      onChange={(e) => handleFactionChange(e.target.value)}
                      className="select-input"
                    >
                      <option value="">Select faction...</option>
                      <option value="Nine Arcane Writs">Nine Arcane Writs</option>
                      <option value="Mechanist Order Command Structure">Mechanist Order Command Structure</option>
                      <option value="Chrome Bishop Proxies">Chrome Bishop Proxies</option>
                      <option value="Guild of the Writless">Guild of the Writless</option>
                      <option value="Merchant's Guild">Merchant's Guild</option>
                      <option value="The Party">The Party</option>
                      <option value="Unaffiliated">Unaffiliated</option>
                    </select>
                    <small className="field-hint">
                      Determines metaball color grouping (color auto-updates)
                    </small>
                  </div>
                )}

                {/* Color (for factions) */}
                {isFactionNode && (
                  <div className="form-field">
                    <label htmlFor="color">Metaball Color</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        id="color"
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        style={{ width: '60px', height: '36px' }}
                      />
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="text-input"
                        placeholder="#6b7280"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                )}

                {/* Role (for special NPCs) */}
                {!isFactionNode && (
                  <div className="form-field">
                    <label htmlFor="role">Role (optional)</label>
                    <input
                      id="role"
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="text-input"
                      placeholder="e.g., Writ Holder, Second in Command"
                    />
                  </div>
                )}
              </>
            )}

            {/* Observations */}
            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label>Observations</label>
                <button
                  type="button"
                  onClick={handleAddObservation}
                  className="button-secondary"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              {observations.length === 0 && (
                <button
                  type="button"
                  onClick={handleAddObservation}
                  className="button-secondary"
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  <Plus size={16} /> Add First Observation
                </button>
              )}

              {observations.map((obs, index) => (
                <div key={index} className="observation-field" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <textarea
                    value={obs}
                    onChange={(e) => handleObservationChange(index, e.target.value)}
                    className="textarea-input"
                    rows={3}
                    placeholder={
                      graphType === 'Political-Web'
                        ? index === 0 ? 'Identity: "Dwarf artificer (level 13) who holds Writ of Ironhollow..."'
                        : index === 1 ? 'Position: "Based in Veilshard, member of Nine Writs"'
                        : index === 2 ? 'Personality: "Ambitious, pragmatic, morally flexible"'
                        : index === 3 ? 'Goals: "Build construct army to defend Ironhollow"'
                        : 'Additional observation or cross-memory anchor...'
                        : 'Free-form observation about this entity...'
                    }
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveObservation(index)}
                    className="button-danger"
                    style={{ padding: '0.5rem' }}
                    title="Remove observation"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {graphType === 'Political-Web' && (
                <details style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                  <summary style={{ cursor: 'pointer' }}>
                    <Info size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                    Observation Template Guide
                  </summary>
                  <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem', lineHeight: '1.6' }}>
                    <li>Identity: Race, class, level, role</li>
                    <li>Position: Location anchors, organization membership, rank</li>
                    <li>Personality: Core traits, speaking style, quirks</li>
                    <li>Goals: Short-term, long-term, secret objectives</li>
                    <li>Relationships: Key alliances, conflicts (explicit edges preferred)</li>
                    <li>Knowledge State: What they know/don't know</li>
                    <li>Status: Current state, recent changes</li>
                    <li>Cross-Memory Anchors: References to other graphs</li>
                  </ul>
                </details>
              )}
            </div>

            {error && (
              <div className="error-message" style={{ padding: '0.75rem', background: '#fee', color: '#c00', borderRadius: '4px', marginTop: '1rem' }}>
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="dialog-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                className="button-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button-primary"
                disabled={!isFormValid || submitting}
              >
                {submitting ? 'Saving...' : isEdit ? 'Update Node' : 'Create Node'}
              </button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button className="dialog-close" aria-label="Close">
              <X size={20} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default GraphNodeEditorDialog;
