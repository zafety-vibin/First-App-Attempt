import React, { useState, KeyboardEvent } from 'react';
import './TagInput.css';

export interface TagInputProps {
  label: string;
  name: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  error?: string;
  placeholder?: string;
  maxTags?: number;
}

/**
 * Tag input component - add tags by typing + Enter, remove with X button
 * Usage: <TagInput label="Tags" name="tags" tags={tags} onChange={setTags} maxTags={10} />
 */
export const TagInput: React.FC<TagInputProps> = ({
  label,
  name,
  tags,
  onChange,
  error,
  placeholder = 'Type and press Enter',
  maxTags,
}) => {
  const [inputValue, setInputValue] = useState('');
  const tagInputId = `tag-input-${name}`;
  const errorId = `${tagInputId}-error`;
  const hasError = Boolean(error);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmedValue = inputValue.trim();

      // Validate: non-empty, not duplicate, within max limit
      if (
        trimmedValue &&
        !tags.includes(trimmedValue) &&
        (!maxTags || tags.length < maxTags)
      ) {
        onChange([...tags, trimmedValue]);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      // Remove last tag if input is empty and backspace pressed
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const isMaxReached = maxTags !== undefined && tags.length >= maxTags;

  return (
    <div className="tag-input-wrapper">
      <label htmlFor={tagInputId} className="tag-input-label">
        {label}
        {maxTags && (
          <span className="tag-input-counter">
            ({tags.length} / {maxTags})
          </span>
        )}
      </label>
      <div
        className={`tag-input-container ${hasError ? 'tag-input-container-error' : ''}`}
        onClick={() => document.getElementById(tagInputId)?.focus()}
      >
        {tags.map((tag, index) => (
          <span key={index} className="tag-chip">
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              className="tag-chip-remove"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={tagInputId}
          name={name}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          disabled={isMaxReached}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className="tag-input"
        />
      </div>
      {hasError && (
        <span id={errorId} className="tag-input-error-message" role="alert">
          {error}
        </span>
      )}
      {isMaxReached && (
        <span className="tag-input-hint">Maximum tags reached</span>
      )}
    </div>
  );
};
