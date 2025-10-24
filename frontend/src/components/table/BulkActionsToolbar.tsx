import React, { useState } from 'react';
import './BulkActionsToolbar.css';

export interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => Promise<void>;
  onBulkSetVisibility: (level: string) => Promise<void>;
  onBulkAddTags: (tags: string[]) => Promise<void>;
}

/**
 * BulkActionsToolbar Component
 * Appears when rows are selected, provides bulk operations
 */
export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkSetVisibility,
  onBulkAddTags,
}) => {
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [showTagsInput, setShowTagsInput] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete ${selectedCount} selected ${selectedCount === 1 ? 'item' : 'items'}? This cannot be undone.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      await onBulkDelete();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetVisibility = async (level: string) => {
    setIsProcessing(true);
    try {
      await onBulkSetVisibility(level);
      setShowVisibilityMenu(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddTags = async () => {
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    if (tags.length === 0) {
      return;
    }

    setIsProcessing(true);
    try {
      await onBulkAddTags(tags);
      setTagsInput('');
      setShowTagsInput(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bulk-actions-toolbar">
      <div className="bulk-actions-info">
        <span className="bulk-actions-count">{selectedCount} selected</span>
        <button
          className="bulk-actions-clear"
          onClick={onClearSelection}
          disabled={isProcessing}
        >
          Clear
        </button>
      </div>

      <div className="bulk-actions-buttons">
        {/* Set Visibility */}
        <div className="bulk-action-group">
          <button
            className="bulk-action-button"
            onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
            disabled={isProcessing}
          >
            Set Visibility
          </button>
          {showVisibilityMenu && (
            <div className="bulk-dropdown-menu">
              <button onClick={() => handleSetVisibility('system')}>System</button>
              <button onClick={() => handleSetVisibility('common_knowledge')}>Common Knowledge</button>
              <button onClick={() => handleSetVisibility('player_knowledge')}>Player Knowledge</button>
              <button onClick={() => handleSetVisibility('dm_only')}>DM Only</button>
            </div>
          )}
        </div>

        {/* Add Tags */}
        <div className="bulk-action-group">
          <button
            className="bulk-action-button"
            onClick={() => setShowTagsInput(!showTagsInput)}
            disabled={isProcessing}
          >
            Add Tags
          </button>
          {showTagsInput && (
            <div className="bulk-dropdown-menu bulk-tags-input-menu">
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTags();
                  }
                }}
                placeholder="tag1, tag2, tag3"
                className="bulk-tags-input"
                autoFocus
              />
              <button onClick={handleAddTags} className="bulk-tags-apply">
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          className="bulk-action-button bulk-action-delete"
          onClick={handleDelete}
          disabled={isProcessing}
        >
          Delete
        </button>
      </div>
    </div>
  );
};
