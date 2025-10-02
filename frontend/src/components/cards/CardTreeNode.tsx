/**
 * Card Tree Node Component - Individual tree node with expand/collapse
 * Feature: 003-create-a-notion
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Card } from '../../../../shared/types/Card';
import { cardService } from '../../services/cardService';

interface CardTreeNodeProps {
  card: Card;
  campaignId: string;
  level?: number;
}

export function CardTreeNode({ card, campaignId, level = 0 }: CardTreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expanded && children.length === 0) {
      loadChildren();
    }
  }, [expanded]);

  const loadChildren = async () => {
    try {
      setLoading(true);
      const childCards = await cardService.getChildren(card.id);
      setChildren(childCards);
    } catch (error) {
      console.error('Failed to load children:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasChildren = card.depth < 50; // Assume might have children if not at max depth
  const indent = level * 20;

  const getCardIcon = () => {
    if (card.iconEmoji) return card.iconEmoji;
    switch (card.type) {
      case 'page':
        return '📄';
      case 'database':
        return '🗂️';
      case 'text':
        return '📝';
      case 'image':
        return '🖼️';
      default:
        return '📄';
    }
  };

  return (
    <div className="card-tree-node">
      <div className="node-row" style={{ paddingLeft: `${indent}px` }}>
        {hasChildren && (
          <button
            className="expand-button"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {loading ? '⋯' : expanded ? '▼' : '▶'}
          </button>
        )}
        {!hasChildren && <span className="no-children-spacer">　</span>}

        <Link to={`/campaigns/${campaignId}/cards/${card.id}`} className="node-link">
          <span className="node-icon">{getCardIcon()}</span>
          <span className="node-title">{card.title || 'Untitled'}</span>
          <span className="node-type">{card.type}</span>
        </Link>
      </div>

      {expanded && children.length > 0 && (
        <div className="node-children">
          {children.map((child) => (
            <CardTreeNode
              key={child.id}
              card={child}
              campaignId={campaignId}
              level={level + 1}
            />
          ))}
        </div>
      )}

      <style>{`
        .card-tree-node {
          font-size: 14px;
        }

        .node-row {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background-color 0.15s;
        }

        .node-row:hover {
          background-color: #f5f5f5;
        }

        .expand-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0 4px;
          font-size: 10px;
          width: 20px;
          text-align: center;
        }

        .no-children-spacer {
          width: 20px;
          display: inline-block;
        }

        .node-link {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: inherit;
          flex: 1;
        }

        .node-link:hover {
          text-decoration: underline;
        }

        .node-icon {
          font-size: 16px;
        }

        .node-title {
          flex: 1;
        }

        .node-type {
          font-size: 11px;
          color: #999;
          text-transform: uppercase;
        }

        .node-children {
          margin-left: 0;
        }
      `}</style>
    </div>
  );
}
