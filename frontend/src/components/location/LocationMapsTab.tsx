/**
 * LocationMapsTab Component
 * Feature: 021-create-a-geographic
 * Task: T029
 *
 * Maps tab for location detail pages.
 * Displays map canvas with pins and regions, provides upload and editing tools.
 */

import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocationMaps } from '../../hooks/useLocationMaps';
import MapCanvas from '../maps/MapCanvas';
import MapControls from '../maps/MapControls';
import MapUploader from '../maps/MapUploader';
import PinEditor from '../maps/PinEditor';
import RegionEditor from '../maps/RegionEditor';
import './LocationMapsTab.css';

export interface LocationMapsTabProps {
  locationId: string;
  campaignId: string;
}

const LocationMapsTab: React.FC<LocationMapsTabProps> = ({ locationId, campaignId }) => {
  const navigate = useNavigate();
  const {
    maps,
    pins,
    regions,
    loading,
    error,
    uploadMapFile,
    removeMap,
    addPin,
    editPin,
    removePin,
    addRegion,
    editRegion,
    removeRegion,
    refresh,
  } = useLocationMaps(locationId);

  // UI state
  const [selectedMapIndex, setSelectedMapIndex] = useState(0);
  const [showUploader, setShowUploader] = useState(false);
  const [showPinEditor, setShowPinEditor] = useState(false);
  const [showRegionEditor, setShowRegionEditor] = useState(false);
  const [pinEditorData, setPinEditorData] = useState<any>(null);
  const [regionEditorData, setRegionEditorData] = useState<any>(null);
  const [editMode, setEditMode] = useState<'pin' | 'region' | null>(null);

  // Map canvas ref for imperative control (zoom, reset)
  const mapCanvasRef = useRef<{ resetView: () => void; zoomIn: () => void; zoomOut: () => void } | null>(null);
  const [currentZoom, setCurrentZoom] = useState(1);

  const selectedMap = maps[selectedMapIndex];
  const selectedMapPins = selectedMap ? pins.filter((p) => p.map_id === selectedMap.id) : [];
  const selectedMapRegions = selectedMap
    ? regions.filter((r) => r.map_id === selectedMap.id).sort((a, b) => a.z_order - b.z_order)
    : [];

  /**
   * Handle map upload success
   */
  const handleUploadSuccess = async (newMap: any) => {
    await refresh();
    setSelectedMapIndex(maps.length); // Select newly uploaded map
  };

  /**
   * Handle map deletion
   */
  const handleDeleteMap = async () => {
    if (!selectedMap) return;
    if (!confirm(`Delete "${selectedMap.name}"? This will also remove all pins and regions.`)) return;

    try {
      await removeMap(selectedMap.id);
      setSelectedMapIndex(Math.max(0, selectedMapIndex - 1));
    } catch (err: any) {
      alert(`Failed to delete map: ${err.message}`);
    }
  };

  /**
   * Handle pin creation from canvas click
   */
  const handleCanvasClick = (x: number, y: number) => {
    if (editMode !== 'pin' || !selectedMap) return;

    setPinEditorData({
      x,
      y,
      map_id: selectedMap.id,
    });
    setShowPinEditor(true);
  };

  /**
   * Handle pin save
   */
  const handlePinSave = async (pinData: any) => {
    try {
      await addPin(pinData);
      setShowPinEditor(false);
      setPinEditorData(null);
      setEditMode(null);
    } catch (err: any) {
      alert(`Failed to save pin: ${err.message}`);
    }
  };

  /**
   * Handle pin click (navigate to linked entity)
   */
  const handlePinClick = (pin: MapPin) => {
    const entityRoute = pin.linked_entity_type === 'location' ? 'locations' : 'npcs';
    navigate(`/campaigns/${campaignId}/${entityRoute}/${pin.linked_entity_id}`);
  };

  /**
   * Handle region save
   */
  const handleRegionSave = async (regionData: any) => {
    try {
      await addRegion(regionData);
      setShowRegionEditor(false);
      setRegionEditorData(null);
      setEditMode(null);
    } catch (err: any) {
      alert(`Failed to save region: ${err.message}`);
    }
  };

  /**
   * Start pin placement mode
   */
  const startPinMode = () => {
    setEditMode('pin');
  };

  /**
   * Start region drawing mode
   */
  const startRegionMode = () => {
    // For prototype: User provides vertices in editor
    // Future: Implement click-to-place polygon drawing on canvas
    if (!selectedMap) return;

    // Provide sample vertices for testing (can be edited in modal)
    const sampleVertices = [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
      { x: 200, y: 250 },
    ];

    setRegionEditorData({
      vertices: sampleVertices,
      map_id: selectedMap.id,
    });
    setShowRegionEditor(true);
  };

  if (loading) {
    return <div className="location-maps-loading">Loading maps...</div>;
  }

  if (error) {
    return (
      <div className="location-maps-error">
        <p>Error: {error}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  return (
    <div className="location-maps-tab">
      {/* Header with controls */}
      <div className="location-maps-header">
        <div className="location-maps-title">
          <h3>Maps</h3>
          {maps.length > 0 && (
            <span className="location-maps-count">{maps.length} map{maps.length !== 1 && 's'}</span>
          )}
        </div>

        <div className="location-maps-actions">
          <button className="location-maps-button" onClick={() => setShowUploader(true)}>
            + Upload Map
          </button>

          {selectedMap && (
            <>
              <button
                className={`location-maps-button ${editMode === 'pin' ? 'active' : ''}`}
                onClick={editMode === 'pin' ? () => setEditMode(null) : startPinMode}
              >
                {editMode === 'pin' ? '✓ Click to Place Pin' : '+ Add Pin'}
              </button>

              <button
                className={`location-maps-button ${editMode === 'region' ? 'active' : ''}`}
                onClick={startRegionMode}
              >
                + Add Region
              </button>

              <button className="location-maps-button location-maps-button-danger" onClick={handleDeleteMap}>
                Delete Map
              </button>
            </>
          )}
        </div>
      </div>

      {/* Map selector (if multiple maps) */}
      {maps.length > 1 && (
        <div className="location-maps-selector">
          {maps.map((map, index) => (
            <button
              key={map.id}
              className={`location-maps-selector-tab ${index === selectedMapIndex ? 'active' : ''}`}
              onClick={() => setSelectedMapIndex(index)}
            >
              {map.name}
            </button>
          ))}
        </div>
      )}

      {/* Canvas */}
      {selectedMap ? (
        <div className="location-maps-canvas-container">
          <MapCanvas
            mapData={selectedMap}
            pins={selectedMapPins}
            regions={selectedMapRegions}
            width={1200}
            height={800}
            onPinClick={handlePinClick}
            onRegionClick={(region) => console.log('Region clicked:', region)}
            editMode={editMode === 'pin'}
            onCanvasClick={handleCanvasClick}
            canvasRef={mapCanvasRef}
            zoom={currentZoom}
            onZoomChange={setCurrentZoom}
          />

          {/* Map Controls Overlay */}
          <div className="location-maps-controls-overlay">
            <MapControls
              zoomLevel={currentZoom}
              onZoomIn={() => mapCanvasRef.current?.zoomIn()}
              onZoomOut={() => mapCanvasRef.current?.zoomOut()}
              onResetView={() => mapCanvasRef.current?.resetView()}
            />
          </div>

          {/* Info panel */}
          <div className="location-maps-info-panel">
            <div className="location-maps-info-section">
              <h4>Pins ({selectedMapPins.length})</h4>
              {selectedMapPins.length === 0 ? (
                <p className="location-maps-empty">No pins on this map</p>
              ) : (
                <div className="location-maps-pin-list">
                  {selectedMapPins.map((pin) => (
                    <div key={pin.id} className="location-maps-pin-item">
                      <span>{pin.label || 'Unnamed Pin'}</span>
                      <button
                        className="location-maps-delete-button"
                        onClick={() => removePin(pin.id)}
                        title="Delete pin"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="location-maps-info-section">
              <h4>Regions ({selectedMapRegions.length})</h4>
              {selectedMapRegions.length === 0 ? (
                <p className="location-maps-empty">No faction regions on this map</p>
              ) : (
                <div className="location-maps-region-list">
                  {selectedMapRegions.map((region) => (
                    <div key={region.id} className="location-maps-region-item">
                      <div className="location-maps-region-color" style={{ background: region.color }} />
                      <span>{region.label || 'Unnamed Region'}</span>
                      <button
                        className="location-maps-delete-button"
                        onClick={() => removeRegion(region.id)}
                        title="Delete region"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="location-maps-empty-state">
          <p>No maps uploaded for this location</p>
          <button className="location-maps-button-large" onClick={() => setShowUploader(true)}>
            Upload Your First Map
          </button>
        </div>
      )}

      {/* Modals */}
      {showUploader && (
        <MapUploader
          locationId={locationId}
          onUploadSuccess={handleUploadSuccess}
          onClose={() => setShowUploader(false)}
        />
      )}

      {showPinEditor && pinEditorData && selectedMap && (
        <PinEditor
          initialData={pinEditorData}
          campaignId={campaignId}
          mapId={selectedMap.id}
          onSave={handlePinSave}
          onClose={() => {
            setShowPinEditor(false);
            setPinEditorData(null);
            setEditMode(null);
          }}
        />
      )}

      {showRegionEditor && regionEditorData && selectedMap && (
        <RegionEditor
          initialData={regionEditorData}
          campaignId={campaignId}
          mapId={selectedMap.id}
          onSave={handleRegionSave}
          onClose={() => {
            setShowRegionEditor(false);
            setRegionEditorData(null);
            setEditMode(null);
          }}
        />
      )}
    </div>
  );
};

export default LocationMapsTab;
