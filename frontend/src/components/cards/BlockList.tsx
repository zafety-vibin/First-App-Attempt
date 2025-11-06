/**
 * BlockList Component - Renders child cards as inline blocks (Notion-style)
 * Feature: 003-create-a-notion (proper architecture)
 *
 * Manages list of blocks with Enter key creating siblings
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  autoFocus: boolean;
  showMenu: boolean;
  onMenuToggle: (cardId: string) => void;
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
  autoFocus,
  showMenu,
  onMenuToggle,
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
          <div
            className="page-block"
            onClick={() => onPageClick(child.id)}
          >
            <span className="page-icon">📄</span>
            <span className="page-title">{child.title || 'Untitled'}</span>
          </div>
        )}

        {/* Text/Heading Block - Minimal inline editor */}
        {child.type === 'text' && (
          <Block
            card={child}
            onUpdate={(content) => onUpdate(child.id, content)}
            onEnter={() => onEnter(child.id)}
            onBackspaceEmpty={() => onBackspaceEmpty(child.id)}
            onTransform={(blockType, headingLevel, listType) => {
              console.log('[SortableBlockItem] onTransform arrow function called with:', { childId: child.id, blockType, headingLevel, listType });
              onTransform(child.id, blockType, headingLevel, listType);
            }}
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
  const { updateCard, createCard, deleteCard, reorderCard } = useCards();
  const { viewMode } = useViewMode();
  const { selectedLevelId, getLevelById } = useInformationLevel();

  // Filter children based on view mode (Feature 004)
  const visibleChildren = useMemo(() => {
    if (viewMode === 'dm_view') {
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
    console.log('[BlockList.loadChildren] CALLED - parentCard.id:', parentCard.id, 'campaignId:', campaignId);
    try {
      setLoading(true);
      console.log('[BlockList.loadChildren] setLoading(true) called');

      // If parentCard.id is null, load root cards for the campaign
      if (parentCard.id === null) {
        console.log('[BlockList.loadChildren] parentCard.id is null, calling getRootCards');
        const childCards = await cardService.getRootCards(campaignId);
        console.log('[BlockList.loadChildren] getRootCards returned:', childCards.length, 'cards');
        const sorted = childCards.sort((a, b) => a.position - b.position);
        console.log('[BlockList.loadChildren] Calling setChildren with', sorted.length, 'cards');
        setChildren(sorted);
        console.log('[BlockList.loadChildren] setChildren called');

        // Auto-create first paragraph block if empty
        if (sorted.length === 0) {
          console.log('[BlockList.loadChildren] No cards, creating empty paragraph');
          await createEmptyParagraph(0);
        }
      } else {
        console.log('[BlockList.loadChildren] parentCard.id is NOT null, calling getChildren');
        const childCards = await cardService.getChildren(parentCard.id);
        console.log('[BlockList.loadChildren] getChildren returned:', childCards.length, 'cards');
        const sorted = childCards.sort((a, b) => a.position - b.position);
        console.log('[BlockList.loadChildren] Calling setChildren with', sorted.length, 'cards');
        setChildren(sorted);
        console.log('[BlockList.loadChildren] setChildren called');

        // Auto-create first paragraph block if empty
        if (sorted.length === 0) {
          console.log('[BlockList.loadChildren] No cards, creating empty paragraph');
          await createEmptyParagraph(0);
        }
      }
    } catch (error) {
      console.error('[BlockList.loadChildren] ERROR:', error);
    } finally {
      console.log('[BlockList.loadChildren] setLoading(false) - COMPLETE');
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
    console.log('[BlockList] handleTransform called with:', { blockId, newType, headingLevel, listType });
    try {
      const block = children.find(c => c.id === blockId);
      if (!block) {
        console.log('[BlockList] Block not found:', blockId);
        return;
      }
      console.log('[BlockList] Found block:', block);

      // Update block type in backend
      const updates: any = { type: newType };

      // TEXT → PAGE: Wrap content into new page
      if (block.type === 'text' && newType === 'page') {
        console.log('[BlockList] TEXT → PAGE transformation starting');
        try {
          const fullText = block.content?.content?.[0]?.content?.[0]?.text || '';
          console.log(`[BlockList] fullText: "${fullText}"`);
          const words = fullText.split(' ').filter(w => w.length > 0);
          const firstWord = words[0] || 'Untitled';
          const remainingText = words.slice(1).join(' ');
          console.log(`[BlockList] firstWord: "${firstWord}", remainingText: "${remainingText}"`);

          // Set page title to first word
          updates.title = firstWord;
          updates.content = null;
          console.log(`[BlockList] About to call updateCard with type: page, title: ${firstWord}`);

          // Transform to page first
          await updateCard(blockId, updates);
          console.log('[BlockList] updateCard completed');

          // Create child block with remaining text (if any)
          if (remainingText || words.length === 1) {
            console.log('[BlockList] Creating child block');
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
            console.log('[BlockList] Child block created');
          }

          console.log('[BlockList] About to call loadChildren');
          await loadChildren();
          console.log('[BlockList] loadChildren completed - TEXT → PAGE transformation complete!');
          return;
        } catch (err: any) {
          console.error('[BlockList] TEXT → PAGE error:', err);
          throw err;
        }
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

        await updateCard(blockId, updates);
        await loadChildren(); // Structural change - reload to show database component
        return;
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

        await updateCard(blockId, updates);
        await loadChildren(); // Structural change - reload to show text editor
        return;
      }

      // For text formatting transformations (headings, lists, quotes),
      // the content is already updated by TipTap in the editor.
      // Don't call updateCard or loadChildren - let the debounced save handle it naturally.
      // Calling loadChildren() here would fetch stale data and overwrite the TipTap changes.
      console.log('[BlockList] Text formatting transformation - skipping updateCard and loadChildren');
      // No-op: Let TipTap debounced save handle it
    } catch (error) {
      console.error('Failed to transform block:', error);
    }
  };

  const handlePageClick = (cardId: string) => {
    navigate(`/campaigns/${campaignId}/cards/${cardId}`);
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

    // Update ALL positions to match new order (prevents conflicts)
    try {
      // Assign sequential positions based on new order
      await Promise.all(
        newChildren.map((card, index) =>
          reorderCard(card.id, { position: index })
        )
      );

      console.log(`✓ Reordered ${newChildren.length} cards`);

      // Reload children to get fresh data from backend
      await loadChildren();
    } catch (error) {
      console.error('Failed to reorder cards:', error);
      // Revert on error
      setChildren(children);
      alert('Failed to save card order. Changes reverted.');
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
                autoFocus={child.id === focusedBlockId}
                showMenu={menuOpenForId === child.id}
                onMenuToggle={handleMenuToggle}
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

