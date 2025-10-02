/**
 * Inline Slash Menu - Appears at cursor when typing '/'
 * Feature: 003-create-a-notion (proper architecture)
 *
 * Transforms the current block type instead of creating new blocks
 */

import React, { useEffect, useRef, useState } from 'react';

export interface SlashMenuItem {
  id: string;
  label: string;
  icon: string;
  description: string;
  blockType: 'text' | 'page' | 'database' | 'image';
  headingLevel?: number;
  listType?: 'bullet' | 'ordered' | 'todo' | 'toggle';
}

const MENU_ITEMS: SlashMenuItem[] = [
  {
    id: 'text',
    label: 'Text',
    icon: '📝',
    description: 'Plain text paragraph',
    blockType: 'text',
  },
  {
    id: 'heading1',
    label: 'Heading 1',
    icon: 'H1',
    description: 'Large section heading',
    blockType: 'text',
    headingLevel: 1,
  },
  {
    id: 'heading2',
    label: 'Heading 2',
    icon: 'H2',
    description: 'Medium section heading',
    blockType: 'text',
    headingLevel: 2,
  },
  {
    id: 'heading3',
    label: 'Heading 3',
    icon: 'H3',
    description: 'Small section heading',
    blockType: 'text',
    headingLevel: 3,
  },
  {
    id: 'bulletlist',
    label: 'Bulleted list',
    icon: '•',
    description: 'Create a bullet list',
    blockType: 'text',
    listType: 'bullet',
  },
  {
    id: 'numberedlist',
    label: 'Numbered list',
    icon: '1.',
    description: 'Create a numbered list',
    blockType: 'text',
    listType: 'ordered',
  },
  {
    id: 'todolist',
    label: 'To-do list',
    icon: '☐',
    description: 'Track tasks with checkboxes',
    blockType: 'text',
    listType: 'todo',
  },
  {
    id: 'togglelist',
    label: 'Toggle list',
    icon: '▸',
    description: 'Collapsible content',
    blockType: 'text',
    listType: 'toggle',
  },
  {
    id: 'quote',
    label: 'Quote',
    icon: '❝',
    description: 'Capture a quote',
    blockType: 'text',
  },
  {
    id: 'page',
    label: 'Page',
    icon: '📄',
    description: 'Create a sub-page',
    blockType: 'page',
  },
  {
    id: 'database',
    label: 'Database',
    icon: '🗂️',
    description: 'Table with properties',
    blockType: 'database',
  },
  {
    id: 'image',
    label: 'Image',
    icon: '🖼️',
    description: 'Upload or embed',
    blockType: 'image',
  },
];

interface InlineSlashMenuProps {
  position: { top: number; left: number };
  onSelect: (item: SlashMenuItem) => void;
  onClose: () => void;
  searchTerm?: string;
}

export function InlineSlashMenu({
  position,
  onSelect,
  onClose,
  searchTerm = '',
}: InlineSlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter items by search term
  const filteredItems = searchTerm
    ? MENU_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : MENU_ITEMS;

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onSelect(filteredItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems, selectedIndex, onSelect, onClose]);

  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="inline-slash-menu"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 1000,
      }}
    >
      <div className="menu-content">
        {filteredItems.map((item, index) => (
          <div
            key={item.id}
            className={`menu-item ${index === selectedIndex ? 'selected' : ''}`}
            onClick={() => onSelect(item)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <span className="menu-icon">{item.icon}</span>
            <div className="menu-text">
              <div className="menu-label">{item.label}</div>
              <div className="menu-description">{item.description}</div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .inline-slash-menu {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .menu-content {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          padding: 4px;
          min-width: 280px;
          max-height: 400px;
          overflow-y: auto;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.1s;
        }

        .menu-item:hover,
        .menu-item.selected {
          background: #f3f4f6;
        }

        .menu-icon {
          font-size: 18px;
          width: 24px;
          text-align: center;
          flex-shrink: 0;
        }

        .menu-text {
          flex: 1;
          min-width: 0;
        }

        .menu-label {
          font-size: 14px;
          font-weight: 500;
          color: #111827;
        }

        .menu-description {
          font-size: 12px;
          color: #6b7280;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </div>
  );
}
