import React, { ReactNode } from 'react';
import './EmptyState.css';

export interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Empty state component with optional icon and action button
 * Renders centered layout with semantic HTML for accessibility
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  message,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`empty-state ${className}`} role="status">
      {icon && <div className="empty-state-icon">{icon}</div>}

      <div className="empty-state-content">
        <h3 className="empty-state-message">{message}</h3>
        {description && <p className="empty-state-description">{description}</p>}
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          className="empty-state-action"
          onClick={onAction}
          aria-label={actionLabel}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
