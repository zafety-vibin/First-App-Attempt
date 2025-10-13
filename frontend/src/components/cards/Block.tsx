/**
 * Block Component - Single editable block (Notion-style)
 * Feature: 003-create-a-notion (proper architecture)
 *
 * Each block is a TipTap editor instance with inline slash commands
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { InlineSlashMenu, type SlashMenuItem } from './InlineSlashMenu';
import type { Card } from '../../../../shared/types/Card';

interface BlockProps {
  card: Card;
  onUpdate: (content: any) => void;
  onEnter: () => void; // Create sibling block below
  onBackspaceEmpty: () => void; // Delete this block if empty
  onTransform: (blockType: string, headingLevel?: number, listType?: string) => void; // Transform block type
  autoFocus?: boolean;
}

export function Block({
  card,
  onUpdate,
  onEnter,
  onBackspaceEmpty,
  onTransform,
  autoFocus = false,
}: BlockProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardIdRef = useRef(card.id);
  const isTransformingRef = useRef(false); // Track if we're in the middle of a transformation
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [slashSearchTerm, setSlashSearchTerm] = useState('');

  // Debounced save
  const debouncedSave = useCallback((content: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      onUpdate(content);
    }, 2000);
  }, [onUpdate]);

  // Get placeholder text based on block type
  const getPlaceholder = () => {
    if (card.type === 'page') return "Untitled";
    return "Type '/' for commands";
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          HTMLAttributes: {
            class: 'bullet-list',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'ordered-list',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'list-item',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'blockquote',
          },
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        HTMLAttributes: {
          class: 'task-item',
        },
        nested: true,
      }),
      Placeholder.configure({
        placeholder: getPlaceholder(),
      }),
    ],
    content: card.content || { type: 'doc', content: [] },
    editable: true,
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getJSON());

      // Check for slash command
      const text = editor.state.doc.textContent;
      const slashMatch = text.match(/\/(\w*)$/);

      if (slashMatch) {
        const searchTerm = slashMatch[1];
        setSlashSearchTerm(searchTerm);

        // Get cursor position
        const { from } = editor.state.selection;
        const coords = editor.view.coordsAtPos(from);
        setSlashMenuPosition({
          top: coords.bottom + 4,
          left: coords.left,
        });
        setShowSlashMenu(true);
      } else if (showSlashMenu) {
        setShowSlashMenu(false);
        setSlashSearchTerm('');
      }
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        // Enter key: check if we're in a list first
        if (event.key === 'Enter' && !event.shiftKey) {
          console.log('[Block Enter] Key pressed, showSlashMenu:', showSlashMenu);

          // If slash menu is open, let the menu handle it
          if (showSlashMenu) {
            console.log('[Block Enter] Slash menu open, letting menu handle');
            return false;
          }

          const { state } = view;
          const { $from } = state.selection;

          // Check if we're inside a list (bulletList, orderedList, taskList)
          // TaskList uses 'taskItem' instead of 'listItem'
          const inListItem = $from.node(-1)?.type.name === 'listItem';
          const inTaskItem = $from.node(-1)?.type.name === 'taskItem';

          console.log('[Block Enter] inListItem:', inListItem, 'inTaskItem:', inTaskItem);

          if (inListItem || inTaskItem) {
            // Let TipTap handle list item creation
            console.log('[Block Enter] In list, letting TipTap handle');
            return false;
          }

          // Not in a list - create sibling block
          console.log('[Block Enter] Creating sibling block');
          event.preventDefault();
          onEnter();
          return true;
        }

        // If slash menu is open, let it handle arrow keys and escape
        if (showSlashMenu && ['ArrowDown', 'ArrowUp', 'Escape'].includes(event.key)) {
          // Menu will handle these
          return false;
        }

        // Backspace on empty block: delete block
        if (event.key === 'Backspace') {
          const isEmpty = view.state.doc.textContent.length === 0;
          if (isEmpty) {
            event.preventDefault();
            onBackspaceEmpty();
            return true;
          }
        }

        return false;
      },
    },
  });

  // Only update on card ID change (navigation)
  useEffect(() => {
    if (editor && card.id !== cardIdRef.current) {
      cardIdRef.current = card.id;
      editor.commands.setContent(card.content || { type: 'doc', content: [] });
    }
  }, [editor, card.id]); // DO NOT include card.content - causes infinite loop!

  // Auto-focus if requested
  useEffect(() => {
    if (editor && autoFocus) {
      editor.commands.focus('end');
    }
  }, [editor, autoFocus]);

  // Handle slash menu selection
  const handleSlashMenuSelect = useCallback((item: SlashMenuItem) => {
    console.log('[Block] handleSlashMenuSelect called with item:', item);
    if (!editor) {
      console.log('[Block] No editor, returning');
      return;
    }

    // Remove the slash and search term from editor
    const text = editor.state.doc.textContent;
    const slashMatch = text.match(/\/(\w*)$/);
    if (slashMatch) {
      const slashLength = slashMatch[0].length;
      const { from } = editor.state.selection;
      editor.commands.deleteRange({
        from: from - slashLength,
        to: from,
      });
    }

    // Close menu
    setShowSlashMenu(false);
    setSlashSearchTerm('');

    // Check if this is a structural transformation (page, database, image)
    const isStructuralTransform = ['page', 'database', 'image'].includes(item.blockType);

    if (isStructuralTransform) {
      console.log('[Block] Structural transformation detected, canceling debounced saves');
      // Cancel any pending debounced saves to prevent race condition
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      // Mark that we're transforming to prevent unmount save
      isTransformingRef.current = true;
    }

    // Apply transformation immediately in editor (only for text formatting, not structural changes)
    if (item.headingLevel) {
      editor.commands.setHeading({ level: item.headingLevel as 1 | 2 | 3 });
    } else if (item.listType === 'bullet') {
      editor.commands.toggleBulletList();
    } else if (item.listType === 'ordered') {
      editor.commands.toggleOrderedList();
    } else if (item.listType === 'todo') {
      editor.commands.toggleTaskList();
    } else if (item.id === 'quote') {
      editor.commands.toggleBlockquote();
    } else if (item.id === 'text') {
      editor.commands.setParagraph();
    }

    // Transform block type in backend
    console.log('[Block] Calling onTransform with:', item.blockType, item.headingLevel, item.listType);
    try {
      const result = onTransform(item.blockType, item.headingLevel, item.listType);
      if (result && typeof result.then === 'function') {
        result.catch((err: any) => {
          console.error('[Block] onTransform promise rejected:', err);
        });
      }
      console.log('[Block] onTransform called successfully');
    } catch (err: any) {
      console.error('[Block] onTransform threw error:', err);
    }

    // Focus editor
    editor.commands.focus();
  }, [editor, onTransform]);

  // Cleanup - save immediately on unmount to prevent data loss
  // Use ref to avoid re-running cleanup when onUpdate reference changes
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Save immediately on unmount (e.g., when filtered out by view mode)
      // BUT skip save if we're in the middle of a structural transformation
      // to prevent race condition where unmount save reverts the transformation
      if (editor && !editor.isDestroyed && !isTransformingRef.current) {
        console.log('[Block] Unmounting, saving content');
        onUpdateRef.current(editor.getJSON());
      } else if (isTransformingRef.current) {
        console.log('[Block] Unmounting during transformation, skipping save to prevent race condition');
      }
    };
  }, [editor]); // Only depend on editor, not onUpdate

  if (!editor) return null;

  return (
    <div className="block" style={{ position: 'relative' }}>
      <EditorContent editor={editor} />

      {/* Inline Slash Menu */}
      {showSlashMenu && (
        <InlineSlashMenu
          position={slashMenuPosition}
          searchTerm={slashSearchTerm}
          onSelect={handleSlashMenuSelect}
          onClose={() => {
            setShowSlashMenu(false);
            setSlashSearchTerm('');
          }}
        />
      )}

      <style>{`
        .block .ProseMirror {
          outline: none;
          padding: 3px 0;
          min-height: 1em;
          line-height: 1.5;
        }

        .block .ProseMirror p {
          margin: 0;
        }

        .block .ProseMirror h1,
        .block .ProseMirror h2,
        .block .ProseMirror h3 {
          margin: 0;
          font-weight: 700;
        }

        .block .ProseMirror h1 {
          font-size: 2em;
        }

        .block .ProseMirror h2 {
          font-size: 1.5em;
        }

        .block .ProseMirror h3 {
          font-size: 1.17em;
        }

        .block .ProseMirror ul,
        .block .ProseMirror ol {
          padding-left: 1.5em;
          margin: 4px 0;
        }

        .block .ProseMirror ul li,
        .block .ProseMirror ol li {
          margin: 2px 0;
        }

        .block .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }

        .block .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .block .ProseMirror ul[data-type="taskList"] li > label {
          flex: 0 0 auto;
          margin-top: 2px;
          user-select: none;
        }

        .block .ProseMirror ul[data-type="taskList"] li > div {
          flex: 1 1 auto;
        }

        .block .ProseMirror blockquote {
          border-left: 3px solid #e5e7eb;
          padding-left: 12px;
          margin: 4px 0;
          color: #6b7280;
        }

        .block .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
