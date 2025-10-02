/**
 * BlockList Component - Renders child cards as inline blocks (Notion-style)
 * Feature: 003-create-a-notion (proper architecture)
 *
 * Manages list of blocks with Enter key creating siblings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cardService } from '../../services/cardService';
import { useCards } from '../../hooks/useCards';
import { Block } from './Block';
import { DatabaseTableView } from '../database/DatabaseTableView';
import { ImageBlock } from './ImageBlock';
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
  onEnter: (cardId: string) => void;
  onBackspaceEmpty: (cardId: string) => void;
  onTransform: (cardId: string, newType: string, headingLevel?: number, listType?: string) => void;
  onPageClick: (cardId: string) => void;
  autoFocus: boolean;
}

function SortableBlockItem({
  child,
  campaignId,
  onUpdate,
  onEnter,
  onBackspaceEmpty,
  onTransform,
  onPageClick,
  autoFocus,
}: SortableBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: child.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="block-item"
      data-block-id={child.id}
    >
      {/* Drag handle */}
      <div
        className="drag-handle"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </div>

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
  const navigate = useNavigate();
  const { updateCard, createCard, deleteCard } = useCards();

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

      // If transforming to page, set a title
      if (newType === 'page') {
        const currentText = block.content?.content?.[0]?.content?.[0]?.text || 'Untitled';
        updates.title = currentText;
        updates.content = null; // Pages don't have inline content
      }

      // If transforming to database, add metadata
      if (newType === 'database') {
        const currentText = block.content?.content?.[0]?.content?.[0]?.text || 'Untitled Database';
        updates.title = currentText;
        updates.content = null;
        updates.metadata = {
          schema: { columns: [] },
          views: [],
          defaultViewId: '',
        };
      }

      // For text blocks with special formatting (headings, lists, quotes),
      // content is already updated by TipTap, so we just save it
      // No need to manually construct content JSON

      await updateCard(blockId, updates);

      // Update local state
      setChildren(prev =>
        prev.map(c => c.id === blockId ? { ...c, ...updates } : c)
      );
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
          items={children.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="block-list">
            {children.map((child) => (
              <SortableBlockItem
                key={child.id}
                child={child}
                campaignId={campaignId}
                onUpdate={handleBlockUpdate}
                onEnter={handleEnter}
                onBackspaceEmpty={handleBackspaceEmpty}
                onTransform={handleTransform}
                onPageClick={handlePageClick}
                autoFocus={child.id === focusedBlockId}
              />
            ))}

            {/* Empty state - show placeholder when no children */}
            {children.length === 0 && (
              <div className="empty-block" onClick={handleAddFirstBlock}>
                <span className="empty-block-text">Type '/' for commands, or just start typing...</span>
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
        }

        .drag-handle {
          position: absolute;
          left: 2px;
          top: 3px;
          width: 22px;
          height: 22px;
          color: transparent;
          font-size: 14px;
          cursor: grab;
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

