/**
 * ImageBlock - Image upload and display component
 * Feature: 003-create-a-notion
 */

import React, { useState, useRef } from 'react';
import { useCards } from '../../hooks/useCards';
import { apiClient } from '../../services/apiClient';

interface ImageBlockProps {
  card: any;
  campaignId: string;
}

export function ImageBlock({ card, campaignId }: ImageBlockProps) {
  const { updateCard } = useCards();
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(card.metadata?.url || '');
  const [caption, setCaption] = useState(card.metadata?.caption || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);

      // Upload image
      const formData = new FormData();
      formData.append('image', file);

      const response = await apiClient.post(`/cards/${card.id}/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update card with image URL
      await updateCard(card.id, {
        metadata: {
          url: response.data.url,
          caption: caption,
          width: response.data.width,
          height: response.data.height,
          size: response.data.size,
        },
      });

      // Update local state to display the image immediately
      setImageUrl(response.data.url);
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleCaptionUpdate = async () => {
    if (!imageUrl) return;

    try {
      await updateCard(card.id, {
        metadata: {
          ...card.metadata,
          caption: caption,
        },
      });
    } catch (error) {
      console.error('Failed to update caption:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this image?')) return;

    try {
      await updateCard(card.id, {
        metadata: {
          url: '',
          caption: '',
        },
      });
      // Update local state to hide the image immediately
      setImageUrl('');
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  // If no image uploaded yet, show upload UI
  if (!imageUrl) {
    return (
      <div className="image-block-empty">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <button
          className="btn-upload"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : '📷 Click to upload image'}
        </button>

        <style>{`
          .image-block-empty {
            margin: 16px 0;
            padding: 48px 24px;
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            text-align: center;
            background: #f9fafb;
          }

          .btn-upload {
            padding: 12px 24px;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            color: #374151;
            cursor: pointer;
            transition: all 0.15s;
          }

          .btn-upload:hover:not(:disabled) {
            background: #f3f4f6;
            border-color: #9ca3af;
          }

          .btn-upload:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    );
  }

  // If image exists, show image with caption
  return (
    <div className="image-block">
      <div className="image-container">
        <img
          src={imageUrl}
          alt={caption || 'Image'}
          className="image"
        />
        <button className="btn-delete" onClick={handleDelete} title="Delete image">
          ✕
        </button>
      </div>

      <input
        type="text"
        className="caption-input"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        onBlur={handleCaptionUpdate}
        placeholder="Add a caption..."
      />

      <style>{`
        .image-block {
          margin: 16px 0;
        }

        .image-container {
          position: relative;
          display: inline-block;
          max-width: 100%;
        }

        .image {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          display: block;
        }

        .btn-delete {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s, background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .image-container:hover .btn-delete {
          opacity: 1;
        }

        .btn-delete:hover {
          background: rgba(0, 0, 0, 0.8);
        }

        .caption-input {
          width: 100%;
          margin-top: 8px;
          padding: 6px 8px;
          border: 1px solid transparent;
          border-radius: 4px;
          font-size: 14px;
          color: #6b7280;
          font-style: italic;
          background: transparent;
          outline: none;
          transition: border-color 0.15s;
        }

        .caption-input:hover,
        .caption-input:focus {
          border-color: #d1d5db;
          background: white;
        }

        .caption-input::placeholder {
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}
