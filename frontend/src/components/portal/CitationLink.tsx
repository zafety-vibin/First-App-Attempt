/**
 * CitationLink Component
 * Feature 009: Player Question Portal
 * T039: Clickable [1] button navigating to /cards/{cardId}
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Citation {
  number: number;
  cardId: string;
  cardTitle: string;
  url: string;
}

interface CitationLinkProps {
  citation: Citation;
}

export const CitationLink: React.FC<CitationLinkProps> = ({ citation }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    // Navigate to card detail page (Feature 003 card routes)
    navigate(citation.url);
  };

  return (
    <button
      onClick={handleClick}
      title={citation.cardTitle}
      style={{
        padding: '0.25rem 0.5rem',
        background: '#e3f2fd',
        border: '1px solid #2196F3',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.85rem',
        color: '#1976d2',
        fontWeight: 'bold',
      }}
    >
      [{citation.number}] {citation.cardTitle}
    </button>
  );
};
