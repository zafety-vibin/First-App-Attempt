/**
 * CategoryLandingTextEditor - Rich text editor for category descriptions
 * Feature: 015-create-the-dashboard (T022)
 *
 * TipTap editor with:
 * - Basic formatting (bold, italic, lists, links)
 * - Auto-save on change (500ms debounce)
 * - Category-specific placeholder text
 */

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import type { CategoryName } from './WidgetRegistry';
import './CategoryLandingTextEditor.css';

interface CategoryLandingTextEditorProps {
  campaignId: string;
  category: CategoryName;
  content: any | null; // TipTap JSON
  onChange: (content: any) => void;
}

// Category display names for placeholders
const CATEGORY_DISPLAY_NAMES: Record<CategoryName, string> = {
  npcs: 'NPCs',
  locations: 'Locations',
  factions: 'Factions',
  session_recaps: 'Session Recaps',
  quests: 'Quests',
  player_characters: 'Player Characters',
  lore_entries: 'Lore Entries',
  world_rules: 'World Rules',
  planar_forces: 'Planar Forces',
  session_prep: 'Session Prep',
  custom_mechanics: 'Custom Mechanics',
  items: 'Items',
  creatures: 'Creatures',
};

/**
 * CategoryLandingTextEditor Component
 * Simple TipTap editor for category landing page descriptions
 */
export const CategoryLandingTextEditor: React.FC<CategoryLandingTextEditorProps> = ({
  category,
  content,
  onChange,
}) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get placeholder text based on category
  const getPlaceholder = () => {
    const displayName = CATEGORY_DISPLAY_NAMES[category] || category;
    return `Describe your ${displayName}... (supports markdown formatting)`;
  };

  // Debounced save
  const debouncedSave = (content: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      onChange(content);
    }, 500); // 500ms debounce delay
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
        blockquote: {
          HTMLAttributes: {
            class: 'blockquote',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Placeholder.configure({
        placeholder: getPlaceholder(),
      }),
    ],
    content: content || { type: 'doc', content: [] },
    editable: true,
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getJSON());
    },
  });

  // Update editor content when prop changes (e.g., category change)
  useEffect(() => {
    if (editor && content) {
      const currentContent = editor.getJSON();
      // Only update if content is different to avoid cursor jumps
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!editor) return null;

  return (
    <div className="category-landing-text-editor">
      {/* Toolbar */}
      <div className="editor-toolbar">
        <button
          type="button"
          className={`toolbar-button ${editor.isActive('bold') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={`toolbar-button ${editor.isActive('italic') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={`toolbar-button ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          className={`toolbar-button ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          className={`toolbar-button ${editor.isActive('bulletList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          •
        </button>
        <button
          type="button"
          className={`toolbar-button ${editor.isActive('orderedList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          1.
        </button>
        <button
          type="button"
          className={`toolbar-button ${editor.isActive('blockquote') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote"
        >
          "
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          title="Add Link"
        >
          🔗
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
};
