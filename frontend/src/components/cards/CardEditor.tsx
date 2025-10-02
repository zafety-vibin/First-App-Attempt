/**
 * Card Editor Component - TipTap rich text editor
 * Feature: 003-create-a-notion
 *
 * UNCONTROLLED COMPONENT: Maintains own state, saves via debounce
 * This prevents cursor jumping during typing
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import type { Card } from '../../../../shared/types/Card';

interface CardEditorProps {
  card: Card;
  onUpdate?: (content: any) => void;
  editable?: boolean;
  placeholder?: string;
  autoSaveDelay?: number; // ms to wait before auto-saving
}

export function CardEditor({
  card,
  onUpdate,
  editable = true,
  placeholder = 'Start typing...',
  autoSaveDelay = 2000, // 2 seconds default
}: CardEditorProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardIdRef = useRef(card.id);

  // Debounced save function
  const debouncedSave = useCallback((content: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (onUpdate) {
        onUpdate(content);
      }
    }, autoSaveDelay);
  }, [onUpdate, autoSaveDelay]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: card.content || { type: 'doc', content: [] },
    editable,
    onUpdate: ({ editor }) => {
      // Debounced save - won't trigger parent re-render immediately
      debouncedSave(editor.getJSON());
    },
  });

  // Only update content if card ID changed (navigated to different card)
  // Don't update on content changes to avoid cursor jumps
  useEffect(() => {
    if (editor && card.id !== cardIdRef.current) {
      cardIdRef.current = card.id;
      editor.commands.setContent(card.content || { type: 'doc', content: [] });
    }
  }, [editor, card.id, card.content]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <div className="card-editor">
      {editable && (
        <div className="editor-toolbar">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
          >
            Bold
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
          >
            Italic
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
          >
            H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
          >
            H3
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
          >
            Bullet List
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'is-active' : ''}
          >
            Numbered List
          </button>
        </div>
      )}
      <EditorContent editor={editor} />

      <style>{`
        .card-editor {
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          min-height: 200px;
        }

        .editor-toolbar {
          display: flex;
          gap: 4px;
          padding: 8px;
          border-bottom: 1px solid #e0e0e0;
          background: #f5f5f5;
        }

        .editor-toolbar button {
          padding: 6px 12px;
          border: 1px solid #ccc;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .editor-toolbar button:hover {
          background: #f0f0f0;
        }

        .editor-toolbar button.is-active {
          background: #e0e0e0;
          font-weight: 600;
        }

        .ProseMirror {
          padding: 16px;
          min-height: 150px;
          outline: none;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #adb5bd;
          float: left;
          height: 0;
          pointer-events: none;
        }

        .ProseMirror h1 {
          font-size: 2em;
          font-weight: 700;
          margin: 0.67em 0;
        }

        .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: 700;
          margin: 0.75em 0;
        }

        .ProseMirror h3 {
          font-size: 1.17em;
          font-weight: 700;
          margin: 0.83em 0;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 2em;
        }
      `}</style>
    </div>
  );
}
