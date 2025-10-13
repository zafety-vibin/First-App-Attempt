import React from 'react';
import './LoadingSpinner.css';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Loading spinner component with size variants
 * Uses CSS keyframes for smooth 60fps rotation animation
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClass = `spinner-${size}`;

  return (
    <div className={`loading-spinner-container ${className}`} role="status" aria-label="Loading">
      <div className={`loading-spinner ${sizeClass}`}>
        <svg className="spinner-svg" viewBox="0 0 50 50">
          <circle
            className="spinner-circle"
            cx="25"
            cy="25"
            r="20"
            fill="none"
            strokeWidth="4"
          />
        </svg>
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
};
