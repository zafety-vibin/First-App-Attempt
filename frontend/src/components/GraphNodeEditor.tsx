/**
 * Graph Node Editor - Edit node properties in knowledge graphs
 * References:
 * - specs/005-create-the-ai/plan.md T064
 */

import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, Tag } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

interface GraphNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  tags?: string[];
  is_active?: boolean;
  attributes?: Record<string, any>;
}

interface GraphNodeEditorProps {
  node: GraphNode;
  graphType: string;
  onSave: (node: GraphNode) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function GraphNodeEditor({ node, graphType, onSave, onDelete, onClose }: GraphNodeEditorProps) {
  const [editedNode, setEditedNode] = useState<GraphNode>(node);
  const [newTag, setNewTag] = useState('');
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  // Node type suggestions based on graph type
  const nodeTypeSuggestions: Record<string, string[]> = {
    geographical: ['City', 'Region', 'Landmark', 'Country', 'Continent', 'Building', 'Natural Feature'],
    'political-web': ['Organization', 'Faction', 'Government', 'Guild', 'Alliance', 'Noble House', 'Company'],
    'world-foundations': ['Rule', 'Magic System', 'Technology', 'Religion', 'Culture', 'Language', 'History'],
    'campaign-story': ['NPC', 'Quest', 'Event', 'Item', 'Location', 'Plot Point', 'Session Recap'],
  };

  const typeSuggestions = nodeTypeSuggestions[graphType] || [];

  const handleSave = () => {
    if (!editedNode.name || !editedNode.type) {
      alert('Name and Type are required');
      return;
    }
    onSave(editedNode);
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      setEditedNode({
        ...editedNode,
        tags: [...(editedNode.tags || []), newTag.trim()],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (index: number) => {
    const tags = [...(editedNode.tags || [])];
    tags.splice(index, 1);
    setEditedNode({ ...editedNode, tags });
  };

  const handleAddAttribute = () => {
    if (newAttrKey.trim() && newAttrValue.trim()) {
      setEditedNode({
        ...editedNode,
        attributes: {
          ...(editedNode.attributes || {}),
          [newAttrKey.trim()]: newAttrValue.trim(),
        },
      });
      setNewAttrKey('');
      setNewAttrValue('');
    }
  };

  const handleRemoveAttribute = (key: string) => {
    const attributes = { ...(editedNode.attributes || {}) };
    delete attributes[key];
    setEditedNode({ ...editedNode, attributes });
  };

  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">
              {editedNode.id ? 'Edit Node' : 'Create Node'}
            </h2>
            <Dialog.Close asChild>
              <button
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Basic Properties */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editedNode.name}
                onChange={(e) => setEditedNode({ ...editedNode, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter node name..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editedNode.type}
                onChange={(e) => setEditedNode({ ...editedNode, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter node type..."
                list="type-suggestions"
              />
              <datalist id="type-suggestions">
                {typeSuggestions.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={editedNode.description || ''}
                onChange={(e) => setEditedNode({ ...editedNode, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Enter description..."
                rows={3}
              />
            </div>

            {/* Active Flag (for supported graphs) */}
            {(graphType === 'political-web' || graphType === 'campaign-story') && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is-active"
                  checked={editedNode.is_active || false}
                  onChange={(e) => setEditedNode({ ...editedNode, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="is-active" className="text-sm font-medium text-gray-700">
                  Mark as Active (included in active filtering)
                </label>
              </div>
            )}

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editedNode.tags?.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(index)}
                      className="ml-1 hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a tag..."
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Custom Attributes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Attributes
              </label>
              {Object.entries(editedNode.attributes || {}).length > 0 && (
                <div className="mb-2 space-y-1">
                  {Object.entries(editedNode.attributes || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">
                        <strong>{key}:</strong> {String(value)}
                      </span>
                      <button
                        onClick={() => handleRemoveAttribute(key)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAttrKey}
                  onChange={(e) => setNewAttrKey(e.target.value)}
                  className="flex-1 px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Attribute name..."
                />
                <input
                  type="text"
                  value={newAttrValue}
                  onChange={(e) => setNewAttrValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttribute())}
                  className="flex-1 px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Attribute value..."
                />
                <button
                  onClick={handleAddAttribute}
                  className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div>
              {onDelete && editedNode.id && (
                <button
                  onClick={onDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Node
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <Dialog.Close asChild>
                <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}