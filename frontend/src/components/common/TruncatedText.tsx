import React, { useState, useRef, useEffect } from 'react';
import './TruncatedText.css';

export interface TruncatedTextProps {
  text: string;
  maxLength: number;
  className?: string;
}

/**
 * TruncatedText Component
 * Displays truncated text with full content shown in tooltip on hover
 * Also allows clicking to copy full text to clipboard
 */
export const TruncatedText: React.FC<TruncatedTextProps> = ({
  text,
  maxLength,
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom'>('bottom');
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  const isTruncated = text.length > maxLength;
  const displayText = isTruncated ? text.substring(0, maxLength) + '...' : text;

  useEffect(() => {
    if (showTooltip && textRef.current) {
      const rect = textRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Show tooltip above if not enough space below
      if (spaceBelow < 200 && spaceAbove > spaceBelow) {
        setTooltipPosition('top');
      } else {
        setTooltipPosition('bottom');
      }
    }
  }, [showTooltip]);

  const handleClick = async (e: React.MouseEvent) => {
    if (!isTruncated) return;

    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  if (!isTruncated) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span
      ref={textRef}
      className={`truncated-text ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={handleClick}
      title="" // Prevent default browser tooltip
    >
      {displayText}
      {showTooltip && (
        <span className={`truncated-tooltip truncated-tooltip-${tooltipPosition}`}>
          {copied ? (
            <span className="truncated-copied">Copied to clipboard!</span>
          ) : (
            <>
              {text}
              <span className="truncated-hint">Click to copy</span>
            </>
          )}
        </span>
      )}
    </span>
  );
};
