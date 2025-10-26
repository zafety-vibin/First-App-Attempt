import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ActionsCell.css';

export interface ActionsCellProps {
  entityId: string;
  category: string;
  campaignId: string;
}

/**
 * ActionsCell Component
 * Provides "View Details" button to navigate to entity detail page
 * Prevents accidental navigation when editing other cells
 */
export const ActionsCell: React.FC<ActionsCellProps> = ({
  entityId,
  category,
  campaignId,
}) => {
  const navigate = useNavigate();

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any parent handlers
    navigate(`/campaigns/${campaignId}/${category}/${entityId}`);
  };

  return (
    <div className="actions-cell">
      <button
        className="actions-cell-button"
        onClick={handleViewClick}
        title="View Details"
        aria-label="View Details"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
  );
};
