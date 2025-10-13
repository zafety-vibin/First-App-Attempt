import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import './FileUpload.css';

export interface FileUploadProps {
  label: string;
  name: string;
  onFileSelect: (file: File | null) => void;
  accept?: string; // e.g., "image/*" or ".pdf,.docx"
  maxSize?: number; // bytes (default 10MB)
  error?: string;
  disabled?: boolean;
}

/**
 * Drag-and-drop file upload component with click-to-browse
 * Usage: <FileUpload label="Upload Image" name="image" onFileSelect={setFile} accept="image/*" maxSize={5 * 1024 * 1024} />
 */
export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  name,
  onFileSelect,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  error,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fileUploadId = `file-upload-${name}`;
  const errorId = `${fileUploadId}-error`;
  const hasError = Boolean(error || validationError);
  const displayError = error || validationError;

  const validateFile = (file: File): string | null => {
    // Size validation
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      return `File size exceeds ${maxSizeMB}MB`;
    }

    // Type validation (if accept specified)
    if (accept) {
      const acceptedTypes = accept.split(',').map((t) => t.trim());
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const mimeType = file.type;

      const isValid = acceptedTypes.some((acceptType) => {
        if (acceptType.startsWith('.')) {
          return fileExtension === acceptType.toLowerCase();
        } else if (acceptType.endsWith('/*')) {
          const category = acceptType.split('/')[0];
          return mimeType.startsWith(category);
        } else {
          return mimeType === acceptType;
        }
      });

      if (!isValid) {
        return `File type not accepted. Accepted: ${accept}`;
      }
    }

    return null;
  };

  const handleFile = (file: File) => {
    const validationErr = validateFile(file);
    if (validationErr) {
      setValidationError(validationErr);
      setSelectedFile(null);
      onFileSelect(null);
    } else {
      setValidationError(null);
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setValidationError(null);
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="file-upload-wrapper">
      <label htmlFor={fileUploadId} className="file-upload-label">
        {label}
      </label>
      <div
        className={`file-upload-area ${isDragging ? 'file-upload-dragging' : ''} ${hasError ? 'file-upload-error' : ''} ${disabled ? 'file-upload-disabled' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={`${label} - ${selectedFile ? `File selected: ${selectedFile.name}` : 'No file selected'}`}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
      >
        <input
          ref={inputRef}
          id={fileUploadId}
          name={name}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="file-upload-input"
          aria-hidden="true"
        />
        {!selectedFile ? (
          <>
            <svg className="file-upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="file-upload-text">
              <span className="file-upload-text-primary">Click to upload</span> or drag and drop
            </p>
            {accept && (
              <p className="file-upload-hint">Accepted: {accept}</p>
            )}
            <p className="file-upload-hint">Max size: {formatFileSize(maxSize)}</p>
          </>
        ) : (
          <div className="file-upload-selected">
            <svg className="file-upload-file-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
            <div className="file-upload-file-info">
              <p className="file-upload-file-name">{selectedFile.name}</p>
              <p className="file-upload-file-size">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="file-upload-remove"
              aria-label="Remove file"
            >
              ×
            </button>
          </div>
        )}
      </div>
      {hasError && (
        <span id={errorId} className="file-upload-error-message" role="alert">
          {displayError}
        </span>
      )}
    </div>
  );
};
