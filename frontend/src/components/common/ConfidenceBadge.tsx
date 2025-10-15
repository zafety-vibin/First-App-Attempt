/**
 * Feature 006: Confidence Badge Component
 * Visual indicator for confidence scores with color coding
 */

import React from 'react';
import './ConfidenceBadge.css';

interface ConfidenceBadgeProps {
  confidence: number; // 0.0 - 1.0
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  showValue = true,
  size = 'md'
}) => {
  const getLevel = (): 'high' | 'medium' | 'low' => {
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.4) return 'medium';
    return 'low';
  };

  const getEmoji = () => {
    const level = getLevel();
    if (level === 'high') return '🟢';
    if (level === 'medium') return '🟡';
    return '🔴';
  };

  const level = getLevel();
  const percentage = Math.round(confidence * 100);

  return (
    <span
      className={`confidence-badge ${level} size-${size}`}
      title={`Confidence: ${percentage}%`}
    >
      <span className="badge-emoji">{getEmoji()}</span>
      {showValue && <span className="badge-value">{percentage}%</span>}
    </span>
  );
};

export default ConfidenceBadge;
