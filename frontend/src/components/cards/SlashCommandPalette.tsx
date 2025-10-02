/**
 * Slash Command Palette - cmdk command palette for card creation
 * Feature: 003-create-a-notion
 */

import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useCards } from '../../hooks/useCards';
import type { CardType } from '../../../../shared/types/Card';

interface SlashCommandPaletteProps {
  campaignId: string;
  parentCardId?: string | null;
  position?: number;
  open: boolean;
  onClose: () => void;
  onCardCreated?: (cardId: string) => void;
}

interface CommandOption {
  value: string;
  label: string;
  icon: string;
  description: string;
  type: CardType;
}

const COMMANDS: CommandOption[] = [
  {
    value: 'page',
    label: 'Page',
    icon: '📄',
    description: 'Create a new page card',
    type: 'page',
  },
  {
    value: 'database',
    label: 'Database',
    icon: '🗂️',
    description: 'Create a database with custom properties',
    type: 'database',
  },
  {
    value: 'text',
    label: 'Text Block',
    icon: '📝',
    description: 'Create a text block',
    type: 'text',
  },
  {
    value: 'image',
    label: 'Image',
    icon: '🖼️',
    description: 'Upload or embed an image',
    type: 'image',
  },
  {
    value: 'heading1',
    label: 'Heading 1',
    icon: 'H1',
    description: 'Large section heading',
    type: 'text',
  },
  {
    value: 'heading2',
    label: 'Heading 2',
    icon: 'H2',
    description: 'Medium section heading',
    type: 'text',
  },
  {
    value: 'heading3',
    label: 'Heading 3',
    icon: 'H3',
    description: 'Small section heading',
    type: 'text',
  },
];

export function SlashCommandPalette({
  campaignId,
  parentCardId = null,
  position = 0,
  open,
  onClose,
  onCardCreated,
}: SlashCommandPaletteProps) {
  const { createCard } = useCards();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const handleSelect = async (command: CommandOption) => {
    try {
      const cardData: any = {
        type: command.type,
        campaignId,
        parentId: parentCardId,
        position,
        title: command.type === 'text' ? null : `New ${command.label}`,
      };

      // Set initial content based on type
      if (command.type === 'page' || command.type === 'text') {
        if (command.value.startsWith('heading')) {
          const level = parseInt(command.value.replace('heading', ''));
          cardData.content = {
            type: 'doc',
            content: [
              {
                type: 'heading',
                attrs: { level },
                content: [{ type: 'text', text: `Heading ${level}` }],
              },
            ],
          };
        } else {
          cardData.content = { type: 'doc', content: [] };
        }
      }

      // Database metadata
      if (command.type === 'database') {
        cardData.metadata = {
          schema: { columns: [] },
          views: [],
          defaultViewId: '',
        };
      }

      // Image metadata placeholder
      if (command.type === 'image') {
        cardData.metadata = {
          url: 'https://via.placeholder.com/800x400?text=Upload+Image',
          caption: 'Click to upload image',
        };
      }

      const newCard = await createCard(cardData);
      onCardCreated?.(newCard.id);
      onClose();
    } catch (error) {
      console.error('Failed to create card from slash command:', error);
      alert('Failed to create card');
    }
  };

  if (!open) return null;

  return (
    <div className="slash-command-overlay">
      <Command label="Command Menu" shouldFilter={true}>
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Search for a command..."
          autoFocus
        />
        <Command.List>
          <Command.Empty>No results found.</Command.Empty>
          <Command.Group heading="Create">
            {COMMANDS.map((cmd) => (
              <Command.Item
                key={cmd.value}
                value={cmd.value}
                onSelect={() => handleSelect(cmd)}
              >
                <span className="cmd-icon">{cmd.icon}</span>
                <div className="cmd-text">
                  <div className="cmd-label">{cmd.label}</div>
                  <div className="cmd-description">{cmd.description}</div>
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>

      <div className="slash-command-backdrop" onClick={onClose} />

      <style>{`
        .slash-command-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .slash-command-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
        }

        .slash-command-overlay [cmdk-root] {
          position: relative;
          z-index: 1001;
          width: 500px;
          max-width: 90vw;
          background: white;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }

        .slash-command-overlay [cmdk-input] {
          width: 100%;
          padding: 16px;
          border: none;
          border-bottom: 1px solid #e0e0e0;
          font-size: 16px;
          outline: none;
        }

        .slash-command-overlay [cmdk-list] {
          max-height: 400px;
          overflow-y: auto;
          padding: 8px;
        }

        .slash-command-overlay [cmdk-group-heading] {
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
        }

        .slash-command-overlay [cmdk-item] {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.15s;
        }

        .slash-command-overlay [cmdk-item]:hover,
        .slash-command-overlay [cmdk-item][aria-selected="true"] {
          background: #f0f0f0;
        }

        .slash-command-overlay [cmdk-empty] {
          padding: 32px;
          text-align: center;
          color: #999;
        }

        .cmd-icon {
          font-size: 24px;
          width: 32px;
          text-align: center;
        }

        .cmd-text {
          flex: 1;
        }

        .cmd-label {
          font-weight: 500;
          margin-bottom: 2px;
        }

        .cmd-description {
          font-size: 12px;
          color: #666;
        }
      `}</style>
    </div>
  );
}
