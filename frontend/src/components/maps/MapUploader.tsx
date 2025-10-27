/**
 * MapUploader Component
 * Feature: 021-create-a-geographic
 * Task: T027
 *
 * File upload dialog for map images.
 * Handles file selection, preview, base64 conversion, and upload to API.
 */

import React, { useState, useRef } from 'react';
import { uploadMap } from '../../services/locationService';
import './MapUploader.css';

export interface MapUploaderProps {
  /** Location ID to upload map to */
  locationId: string;
  /** Callback when upload succeeds */
  onUploadSuccess: (mapData: any) => void;
  /** Callback to close the uploader */
  onClose: () => void;
}

const MapUploader: React.FC<MapUploaderProps> = ({
  locationId,
  onUploadSuccess,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mapName, setMapName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle file selection
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/)) {
      setError('Only PNG, JPG, and WebP images are supported');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10MB. Please compress the image.');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Generate preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Auto-fill name from filename
    if (!mapName) {
      setMapName(file.name.replace(/\.[^/.]+$/, '')); // Remove extension
    }
  };

  /**
   * Handle upload submission
   */
  const handleUpload = async () => {
    if (!selectedFile || !mapName.trim() || !preview) {
      setError('Please select a file and enter a map name');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Load image to get dimensions
      const img = new Image();
      img.src = preview;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Prepare payload
      const payload = {
        name: mapName.trim(),
        data: preview, // base64 data URL
        width: img.width,
        height: img.height,
      };

      // Call API using locationService (includes auth)
      const uploadedMap = await uploadMap(locationId, payload);
      onUploadSuccess(uploadedMap);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload map');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="map-uploader-overlay" onClick={onClose}>
      <div className="map-uploader-modal" onClick={(e) => e.stopPropagation()}>
        <div className="map-uploader-header">
          <h3>Upload Map Image</h3>
          <button className="map-uploader-close" onClick={onClose}>×</button>
        </div>

        <div className="map-uploader-content">
          {/* File Input */}
          <div className="map-uploader-field">
            <label>Select Image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileSelect}
              className="map-uploader-file-input"
            />
            <div className="map-uploader-hint">
              Supported formats: PNG, JPG, WebP • Max size: 10MB
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="map-uploader-preview">
              <label>Preview</label>
              <img src={preview} alt="Map preview" className="map-uploader-preview-image" />
              {selectedFile && (
                <div className="map-uploader-preview-info">
                  {selectedFile.name} • {Math.round(selectedFile.size / 1024)} KB
                </div>
              )}
            </div>
          )}

          {/* Map Name */}
          <div className="map-uploader-field">
            <label>Map Name *</label>
            <input
              type="text"
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              placeholder="e.g., Faerûn World Map"
              className="map-uploader-text-input"
              maxLength={100}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="map-uploader-error">
              {error}
            </div>
          )}
        </div>

        <div className="map-uploader-footer">
          <button
            className="map-uploader-button map-uploader-button-secondary"
            onClick={onClose}
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            className="map-uploader-button map-uploader-button-primary"
            onClick={handleUpload}
            disabled={!selectedFile || !mapName.trim() || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload Map'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapUploader;
