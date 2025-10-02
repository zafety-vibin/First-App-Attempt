/**
 * Card Tree Component - Hierarchical tree view of campaign cards
 * Feature: 003-create-a-notion
 */

import React from 'react';
import { CardTreeNode } from './CardTreeNode';
import type { Card } from '../../../../shared/types/Card';

interface CardTreeProps {
  cards: Card[];
  campaignId: string;
  loading?: boolean;
}

export function CardTree({ cards, campaignId, loading }: CardTreeProps) {
  if (loading) {
    return <div className="card-tree-loading">Loading cards...</div>;
  }

  if (cards.length === 0) {
    return (
      <div className="card-tree-empty">
        <p>No cards yet. Create your first card to get started!</p>
      </div>
    );
  }

  return (
    <div className="card-tree">
      {cards.map((card) => (
        <CardTreeNode key={card.id} card={card} campaignId={campaignId} />
      ))}

      <style>{`
        .card-tree {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 8px 0;
          min-height: 200px;
        }

        .card-tree-loading,
        .card-tree-empty {
          padding: 32px;
          text-align: center;
          color: #666;
        }

        .card-tree-empty p {
          margin: 0;
        }
      `}</style>
    </div>
  );
}
