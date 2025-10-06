/**
 * BlockList Component - Renders child cards as inline blocks (Notion-style)
 * Feature: 003-create-a-notion (proper architecture)
 *
 * Manages list of blocks with Enter key creating siblings
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cardService } from '../../services/cardService';
import { useCards } from '../../hooks/useCards';
import { useViewMode } from '../../contexts/ViewModeContext';
import { useInformationLevel } from '../../contexts/InformationLevelContext';
import { Block } from './Block';
import { DatabaseTableView } from '../database/DatabaseTableView';
import { ImageBlock } from './ImageBlock';
import { BlockMenu } from './BlockMenu';
import type { Card } from '../../../../shared/types/Card';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BlockListProps {
  parentCard: Card;
  campaignId: string;
}

interface SortableBlockItemProps {
  child: Card;
  campaignId: string;
  onUpdate: (cardId: string, content: any) => void;
  onUpdateLevel: (cardId: string, levelId: string) => void;
  onDelete: (cardId: string) => void;
  onEnter: (cardId: string) => void;
  onBackspaceEmpty: (cardId: string) => void;
  onTransform: (cardId: string, newType: string, headingLevel?: number, listType?: string) => void;
  onPageClick: (cardId: string) => void;
  onPageTitleUpdate: (cardId: string, newTitle: string) => void;
  autoFocus: boolean;
  showMenu: boolean;
  onMenuToggle: (cardId: string) => void;
  focusPageTitle?: boolean;
}

function SortableBlockItem({
  child,
  campaignId,
  onUpdate,
  onUpdateLevel,
  onDelete,
  onEnter,
  onBackspaceEmpty,
  onTransform,
  onPageClick,
  onPageTitleUpdate,
  autoFocus,
  showMenu,
  onMenuToggle,
  focusPageTitle = false,
}: SortableBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: child.id });

  const { getLevelById } = useInformationLevel();
  const level = getLevelById(child.informationLevelId);
  const isHierarchical = level?.hierarchical || false;

  // Page title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(focusPageTitle);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus title input when focusPageTitle is true
  useEffect(() => {
    if (focusPageTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [focusPageTitle]);

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTitle = e.currentTarget.value.trim();
      if (newTitle !== child.title) {
        onPageTitleUpdate(child.id, newTitle);
      }
      setIsEditingTitle(false);
      onEnter(child.id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditingTitle(false);
      if (titleInputRef.current) {
        titleInputRef.current.value = child.title || 'Untitled';
      }
    }
  };

  const handleTitleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newTitle = e.currentTarget.value.trim();
    if (newTitle !== child.title) {
      onPageTitleUpdate(child.id, newTitle);
    }
    setIsEditingTitle(false);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`block-item ${isHierarchical ? 'block-item-hierarchical' : ''}`}
      data-block-id={child.id}
    >
      {/* Drag handle with menu */}
      <div className="drag-handle-wrapper">
        <div
          className="drag-handle"
          {...attributes}
          {...listeners}
          onClick={(e) => {
            e.stopPropagation();
            onMenuToggle(child.id);
          }}
        >
          ⋮⋮
        </div>
        {showMenu && (
          <BlockMenu
            card={child}
            onClose={() => onMenuToggle(child.id)}
            onLevelChange={(levelId) => onUpdateLevel(child.id, levelId)}
            onDelete={() => onDelete(child.id)}
            onTransformToPage={() => onTransform(child.id, 'page')}
            onTransformToDatabase={() => onTransform(child.id, 'database')}
            onTransformToText={() => onTransform(child.id, 'text')}
          />
        )}
      </div>

      {/* Secret indicator for hierarchical blocks */}
      {isHierarchical && (
        <div className="secret-indicator" title={`${level?.name} (Hidden in Player View)`}>
          👁️
        </div>
      )}

      {/* Block content */}
      <div className="block-content">
        {/* Page Block - Clickable, navigates */}
        {child.type === 'page' && (
          <div className="page-block">
            <span className="page-icon">📄</span>
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                className="page-title-input"
                defaultValue={child.title || 'Untitled'}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleTitleBlur}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span
                  className="page-title"
                  onClick={() => onPageClick(child.id)}
                >
                  {child.title || 'Untitled'}
                </span>
                <button
                  className="page-edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }}
                  title="Edit title"
                >
                  ✏️
                </button>
              </>
            )}
          </div>
        )}

        {/* Text/Heading Block - Minimal inline editor */}
        {child.type === 'text' && (
          <Block
            card={child}
            onUpdate={(content) => onUpdate(child.id, content)}
            onEnter={() => onEnter(child.id)}
            onBackspaceEmpty={() => onBackspaceEmpty(child.id)}
            onTransform={(blockType, headingLevel, listType) =>
              onTransform(child.id, blockType, headingLevel, listType)
            }
            autoFocus={autoFocus}
          />
        )}

        {/* Database Block - Inline table view */}
        {child.type === 'database' && (
          <DatabaseTableView databaseCard={child} campaignId={campaignId} />
        )}

        {/* Image Block - Upload and display */}
        {child.type === 'image' && (
          <ImageBlock card={child} campaignId={campaignId} />
        )}
      </div>
    </div>
  );
}

export function BlockList({ parentCard, campaignId }: BlockListProps) {
  const [children, setChildren] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [menuOpenForId, setMenuOpenForId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { updateCard, createCard, deleteCard } = useCards();
  const { viewMode } = useViewMode();
  const { levels, selectedLevelId, getLevelById } = useInformationLevel();

  // Filter children based on view mode (Feature 004)
  const visibleChildren = useMemo(() => {
    if (viewMode === 'dm') {
      // DM View: Show all cards
      return children;
    } else {
      // Player View: Hide hierarchical (DM Secret) cards
      return children.filter(child => {
        const level = getLevelById(child.informationLevelId);
        return level ? !level.hierarchical : true;
      });
    }
  }, [children, viewMode, getLevelById]);

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts (prevents accidental drags)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadChildren();
  }, [parentCard.id]);

  const loadChildren = async () => {
    try {
      setLoading(true);

      // If parentCard.id is null, load root cards for the campaign
      const childCards = parentCard.id === null
        ? await cardService.getRootCards(campaignId)
        : await cardService.getChildren(parentCard.id);

      const sorted = childCards.sort((a, b) => a.position - b.position);
      setChildren(sorted);

      // Auto-create first paragraph block if empty
      if (sorted.length === 0) {
        await createEmptyParagraph(0);
      }
    } catch (error) {
      console.error('Failed to load children:', error);
    } finally {
      setLoading(false);
    }
  };

  const createEmptyParagraph = async (position: number) => {
    try {
      const newBlock = await createCard({
        type: 'text',
        campaignId,
        parentId: parentCard.id === null ? null : parentCard.id,
        position,
        title: null,
        content: { type: 'doc', content: [] },
        informationLevelId: selectedLevelId, // Feature 004: Use active level from Easel
      });
      setChildren(prev => [...prev, newBlock].sort((a, b) => a.position - b.position));
      setFocusedBlockId(newBlock.id);
      return newBlock;
    } catch (error) {
      console.error('Failed to create empty paragraph:', error);
    }
  };

  const handleBlockUpdate = async (cardId: string, content: any) => {
    try {
      await updateCard(cardId, { content });
    } catch (error) {
      console.error('Failed to update block:', error);
    }
  };

  const handleLevelUpdate = async (cardId: string, levelId: string) => {
    try {
      await updateCard(cardId, { informationLevelId: levelId });
      setChildren(prev =>
        prev.map(c => c.id === cardId ? { ...c, informationLevelId: levelId } : c)
      );
    } catch (error) {
      console.error('Failed to update information level:', error);
    }
  };

  const handleDelete = async (cardId: string) => {
    try {
      await deleteCard(cardId);
      setChildren(prev => prev.filter(c => c.id !== cardId));
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  };

  const handleMenuToggle = (cardId: string) => {
    setMenuOpenForId(prev => prev === cardId ? null : cardId);
  };

  const handleEnter = async (currentBlockId: string) => {
    // Create new sibling block below
    const currentIndex = children.findIndex(c => c.id === currentBlockId);
    if (currentIndex === -1) return;

    const newPosition = children[currentIndex].position + 1;

    try {
      const newBlock = await createCard({
        type: 'text',
        campaignId,
        parentId: parentCard.id === null ? null : parentCard.id,
        position: newPosition,
        title: null,
        content: { type: 'doc', content: [] },
        informationLevelId: selectedLevelId, // Feature 004: Use active level from Easel
      });

      // Update positions of blocks below
      const updated = children.map(c =>
        c.position >= newPosition && c.id !== currentBlockId
          ? { ...c, position: c.position + 1 }
          : c
      );

      setChildren([...updated, newBlock].sort((a, b) => a.position - b.position));
      setFocusedBlockId(newBlock.id);
    } catch (error) {
      console.error('Failed to create sibling block:', error);
    }
  };

  const handleBackspaceEmpty = async (blockId: string) => {
    // Don't delete if it's the only block
    if (children.length === 1) return;

    try {
      await deleteCard(blockId);
      setChildren(prev => prev.filter(c => c.id !== blockId));

      // Focus previous block
      const index = children.findIndex(c => c.id === blockId);
      if (index > 0) {
        setFocusedBlockId(children[index - 1].id);
      }
    } catch (error) {
      console.error('Failed to delete block:', error);
    }
  };

  const handleTransform = async (blockId: string, newType: string, headingLevel?: number, listType?: string) => {
    try {
      const block = children.find(c => c.id === blockId);
      if (!block) return;

      // Update block type in backend
      const updates: any = { type: newType };

      // TEXT → PAGE: Wrap content into new page
      if (block.type === 'text' && newType === 'page') {
        const fullText = block.content?.content?.[0]?.content?.[0]?.text || '';
        const words = fullText.split(' ').filter(w => w.length > 0);
        const firstWord = words[0] || 'Untitled';
        const remainingText = words.slice(1).join(' ');

        // Set page title to first word
        updates.title = firstWord;
        updates.content = null;

        // Transform to page first
        await updateCard(blockId, updates);

        // Create child block with remaining text (if any)
        if (remainingText || words.length === 1) {
          const childContent = {
            type: 'doc',
            content: remainingText ? [{
              type: 'paragraph',
              content: [{ type: 'text', text: words.length === 1 ? fullText : remainingText }]
            }] : []
          };
          await createCard({
            type: 'text',
            campaignId,
            parentId: blockId, // Child of the new page
            position: 0,
            content: childContent,
            informationLevelId: block.informationLevelId, // Inherit level
          });
        }

        await loadChildren();
        return;
      }

      // PAGE → TEXT: Unwrap and promote children up
      if (block.type === 'page' && newType === 'text') {
        const pageTitle = block.title || 'Untitled';

        // Get children of the page
        const pageChildren = await cardService.getChildren(blockId);

        // Transform page to text with title as heading
        updates.title = null;
        updates.content = {
          type: 'doc',
          content: [{
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: pageTitle }]
          }]
        };

        await updateCard(blockId, updates);

        // Move all page children up to be siblings (same parent as the converted text block)
        // Use the block's actual parent_id (not parentCard.id which might be virtual)
        const targetParentId = block.parentId;
        let newPosition = block.position + 1;

        for (const child of pageChildren.sort((a, b) => a.position - b.position)) {
          try {
            await cardService.moveCard(child.id, {
              parentId: targetParentId,
              position: newPosition++,
            });
          } catch (err) {
            console.error('Failed to move child during unwrap:', child.id, err);
          }
        }

        await loadChildren();
        return;
      }

      // TEXT → DATABASE: Use text as database title
      if (block.type === 'text' && newType === 'database') {
        const currentText = block.content?.content?.[0]?.content?.[0]?.text || 'Untitled Database';
        updates.title = currentText;
        updates.content = null;
        updates.metadata = {
          schema: { columns: [] },
          views: [],
          defaultViewId: '',
        };
      }

      // DATABASE → TEXT: Use database title as text
      if (block.type === 'database' && newType === 'text') {
        const dbTitle = block.title || '';
        updates.title = null;
        updates.content = {
          type: 'doc',
          content: dbTitle ? [{
            type: 'paragraph',
            content: [{ type: 'text', text: dbTitle }]
          }] : []
        };
      }

      // For text blocks with special formatting (headings, lists, quotes),
      // content is already updated by TipTap, so we just save it
      // No need to manually construct content JSON

      await updateCard(blockId, updates);

      // Only reload children if the block TYPE changed (text→database, database→text)
      // For formatting changes within same type (headings, lists, quotes), keep focus
      const typeChanged = block.type !== newType;
      if (typeChanged) {
        await loadChildren();
      } else {
        // Keep focus on the current block for formatting changes
        setFocusedBlockId(blockId);
      }
    } catch (error) {
      console.error('Failed to transform block:', error);
    }
  };

  const handlePageClick = (cardId: string) => {
    navigate(`/campaigns/${campaignId}/cards/${cardId}`);
  };

  const handlePageTitleUpdate = async (cardId: string, newTitle: string) => {
    try {
      await updateCard(cardId, { title: newTitle });
    } catch (error) {
      console.error('Failed to update page title:', error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = children.findIndex((c) => c.id === active.id);
    const newIndex = children.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistic update
    const newChildren = arrayMove(children, oldIndex, newIndex);
    setChildren(newChildren);

    // Update positions in backend
    try {
      // Update all affected cards' positions
      const updates = newChildren.map((card, index) => ({
        id: card.id,
        position: index,
      }));

      // Send position updates to backend
      for (const update of updates) {
        await updateCard(update.id, { position: update.position });
      }
    } catch (error) {
      console.error('Failed to update positions:', error);
      // Revert on error
      setChildren(children);
    }
  };

  const handleAddFirstBlock = async () => {
    try {
      const newCard = await createCard({
        type: 'text',
        campaignId: campaignId,
        parentId: parentCard.id === null ? null : parentCard.id,
        position: 0,
        content: { type: 'doc', content: [] },
        informationLevelId: selectedLevelId, // Feature 004: Use active level from Easel
      });

      setChildren([newCard]);
      setFocusedBlockId(newCard.id);
    } catch (error) {
      console.error('Failed to create first block:', error);
    }
  };

  if (loading) {
    return <div style={{ padding: '1rem', color: '#999' }}>Loading...</div>;
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleChildren.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="block-list">
            {visibleChildren.map((child) => (
              <SortableBlockItem
                key={child.id}
                child={child}
                campaignId={campaignId}
                onUpdate={handleBlockUpdate}
                onUpdateLevel={handleLevelUpdate}
                onDelete={handleDelete}
                onEnter={handleEnter}
                onBackspaceEmpty={handleBackspaceEmpty}
                onTransform={handleTransform}
                onPageClick={handlePageClick}
                onPageTitleUpdate={handlePageTitleUpdate}
                autoFocus={child.id === focusedBlockId}
                showMenu={menuOpenForId === child.id}
                onMenuToggle={handleMenuToggle}
                focusPageTitle={child.id === focusedBlockId && child.type === 'page'}
              />
            ))}

            {/* Empty state - show placeholder when no children */}
            {children.length === 0 && (
              <div className="empty-block" onClick={handleAddFirstBlock}>
                <span className="empty-block-text">Type '/' for commands, or just start typing...</span>
              </div>
            )}
            {/* View mode filtering message */}
            {children.length > 0 && visibleChildren.length === 0 && (
              <div className="empty-block">
                <span className="empty-block-text">All blocks hidden in Player View</span>
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <style>{`
        .block-list {
          padding: 0;
        }

        .block-item {
          position: relative;
          display: flex;
          align-items: flex-start;
          margin: 1px 0;
          border-radius: 3px;
          transition: background-color 0.15s;
        }

        .block-item-hierarchical {
          background-color: rgba(239, 68, 68, 0.05); /* Always show red tint for secrets */
        }

        .secret-indicator {
          position: absolute;
          top: 2px;
          right: 4px;
          font-size: 14px;
          opacity: 0; /* Hidden by default */
          transition: opacity 0.15s;
          pointer-events: none;
          z-index: 10;
        }

        .block-item-hierarchical:hover .secret-indicator {
          opacity: 0.6; /* Show closed eye on hover */
        }

        .drag-handle-wrapper {
          position: absolute;
          left: 2px;
          top: 3px;
        }

        .drag-handle {
          width: 22px;
          height: 22px;
          color: transparent;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          transition: all 0.1s;
          user-select: none;
        }

        .drag-handle:active {
          cursor: grabbing;
        }

        .block-item:hover .drag-handle {
          color: #9ca3af;
        }

        .drag-handle:hover {
          background: #f3f4f6;
          color: #6b7280;
        }

        .block-content {
          flex: 1;
          padding-left: 26px;
          min-width: 0;
          overflow: hidden;
        }

        .page-block {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 0;
          cursor: pointer;
          border-radius: 3px;
          transition: background 0.1s;
        }

        .page-block:hover {
          background: rgba(0, 0, 0, 0.03);
        }

        .page-icon {
          font-size: 16px;
          flex-shrink: 0;
        }

        .page-title {
          font-size: 14px;
          color: #374151;
        }

        .page-edit-btn {
          opacity: 0;
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px 4px;
          font-size: 12px;
          transition: opacity 0.1s;
        }

        .page-block:hover .page-edit-btn {
          opacity: 1;
        }

        .page-title-input {
          font-size: 14px;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 3px;
          padding: 2px 6px;
          outline: none;
          flex: 1;
        }

        .page-title-input:focus {
          border-color: #3b82f6;
        }

        .empty-block {
          padding: 12px 0;
          padding-left: 26px;
          cursor: text;
          min-height: 32px;
          display: flex;
          align-items: center;
        }

        .empty-block:hover .empty-block-text {
          color: #6b7280;
        }

        .empty-block-text {
          color: #9ca3af;
          font-size: 14px;
          pointer-events: none;
        }
      `}</style>
    </>
  );
}

