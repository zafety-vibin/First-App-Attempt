# Research: Geographic Map System

**Feature**: 021-create-a-geographic
**Date**: 2025-10-26

## Overview

This document captures technical decisions and research findings for implementing a geographic map system integrated with the Location category database. Includes map viewport widget for dashboard, location maps with pins and regions, geographic hierarchy navigator, and map-to-map navigation.

## Technical Decisions

### 1. Canvas Library: Konva.js + react-konva

**Decision**: Use Konva.js with react-konva bindings for map canvas rendering

**Rationale**:
- Already evaluated and chosen for Feature 007 (interactive maps for wiki cards)
- Strong React integration via react-konva (declarative component API)
- Excellent performance for pan/zoom interactions (60fps achievable)
- Built-in event handling for clicks, drags, hovers
- Shape primitives (Circle for pins, Line for regions) out of the box
- Layer system for z-ordering pins and regions
- Battle-tested for 100+ interactive objects per canvas
- Good TypeScript support via @types/react-konva

**Alternatives Considered**:
- Three.js: Rejected - overkill for 2D maps, larger bundle size, 3D complexity unnecessary
- Pixi.js: Rejected - gaming-focused, less React-friendly, steeper learning curve
- Canvas API (raw): Rejected - reinventing the wheel, weeks to build event handling and shapes
- SVG (plain): Rejected - poor performance at 100+ elements, no built-in pan/zoom

**Implementation Notes**:
- Use Konva Stage as root container (matches viewport size)
- Layer 0: Map image (Konva.Image)
- Layer 1: Faction regions (Konva.Line with closed path)
- Layer 2: Map pins (Konva.Circle + Konva.Text)
- Pan: Drag entire Stage
- Zoom: Scale Stage with transform origin at mouse position

### 2. Image Storage: SQLite BLOB

**Decision**: Store map images as BLOBs in SQLite database

**Rationale**:
- Consistent with project architecture (SQLite-first, file-based storage)
- No file system management complexity (no path references, no cleanup)
- Atomic transactions (map + pins + regions inserted together)
- Docker volume persistence (data/ directory bind mount)
- Simpler backup (single database file contains everything)
- Acceptable performance for prototype scale (<10MB images, <100 maps per campaign)
- Already used in Feature 007 for wiki card map images

**Alternatives Considered**:
- File system storage: Rejected - requires path management, cleanup logic, separate from database transactions
- External CDN/storage: Rejected - violates local-only principle, adds dependency
- Base64 in JSON: Rejected - inefficient storage, bloats JSON payloads
- Separate map_images table: Rejected - unnecessary normalization for prototype, BLOB in locations table sufficient

**Implementation Notes**:
- Add map_images TEXT column to locations table (JSON array of BLOB IDs)
- Create map_image_blobs table: {id, location_id, blob_data BLOB, content_type, created_at}
- Or simpler: Store base64 in locations.map_images JSON (inline, no separate table)
- **Decision**: Inline base64 in JSON for prototype simplicity
- Structure: `map_images: [{id, name, data: "data:image/png;base64,...", uploaded_at}]`
- 10MB per map = ~13MB base64 = acceptable for prototype

### 3. Pin Coordinate System: Absolute Pixels

**Decision**: Store pin coordinates as absolute pixel positions (x, y) relative to map image

**Rationale**:
- Simplest implementation (no coordinate conversion math)
- Accurate positioning regardless of zoom level
- Konva.js works natively in pixels
- No scaling calculations needed when rendering
- Matches user mental model (click position = pin position)
- Straightforward validation (0 <= x <= imageWidth, 0 <= y <= imageHeight)

**Alternatives Considered**:
- Relative percentages (0-100%): Rejected - requires conversion on every render, floating point precision issues
- Normalized coordinates (0-1): Rejected - same issues as percentages, less intuitive
- Geographic coordinates (lat/long): Rejected - overkill for fantasy maps, requires projection math

**Implementation Notes**:
- Pin structure: `{id, x: number, y: number, ...}`
- Validation: Check x/y within image dimensions
- Rendering: Direct pass-through to Konva.Circle (no conversion)
- Out-of-bounds pins: Clamp to image edges or show warning

### 4. Dashboard Widget Architecture: Reuse react-grid-layout

**Decision**: Implement MapViewportWidget using existing react-grid-layout system from Feature 015

**Rationale**:
- Consistent with dashboard architecture (all widgets use same grid system)
- Drag-drop, resize already implemented
- Configuration persistence already handled (dashboard_configs table)
- Widget registry pattern established (just register new widget)
- Size-adaptive rendering pattern defined (compact vs detailed layouts)

**Alternatives Considered**:
- Custom widget container: Rejected - duplicates Feature 015 work, breaks consistency
- Fixed-position widget: Rejected - doesn't match dashboard UX, users expect drag-drop

**Implementation Notes**:
- Widget ID: 'map-viewport'
- Supported sizes: ['2x2', '3x3', '4x4']
- Default size: '3x3'
- Widget props: {size, viewMode, campaignId, onRemove, onConfigure}
- Configuration: Store selected location_id + map_index in widget config
- User selects which location's which map to display
- Pan/zoom state saved in widget instance config

### 5. Hierarchy Tree Rendering: Recursive Component Pattern

**Decision**: Use recursive React component for location tree with cycle detection

**Rationale**:
- Recursive components natural fit for tree structures
- React handles component lifecycle and memoization
- Collapse/expand state per node via local state
- Cycle detection at data loading time (before render)
- Simple breadcrumb generation via parent_location_id traversal

**Alternatives Considered**:
- Flat list with indentation: Rejected - harder to implement collapse/expand, less visual clarity
- Third-party tree library: Rejected - adds dependency for simple feature, over-engineered
- Custom tree traversal logic: Rejected - React recursion simpler, less code

**Implementation Notes**:
```typescript
interface LocationTreeNode {
  location: Location;
  children: LocationTreeNode[];
  depth: number;
  hasMap: boolean;
}

function LocationTreeItem({ node, depth, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ paddingLeft: depth * 20 }}>
      <button onClick={() => setExpanded(!expanded)}>
        {node.children.length > 0 ? (expanded ? '▼' : '▶') : ''}
      </button>
      <button onClick={() => onSelect(node.location.id)}>
        {node.location.name} {node.hasMap && '🗺️'}
      </button>
      {expanded && node.children.map(child => (
        <LocationTreeItem key={child.location.id} node={child} depth={depth + 1} onSelect={onSelect} />
      ))}
    </div>
  );
}
```

- Cycle detection: Build Set of visited IDs while traversing parent_location_id chain
- If cycle found: Break chain at detection point, show warning icon

### 6. Map-to-Map Navigation: Client-Side State with Preloading

**Decision**: Client-side state management for map transitions, preload linked location maps

**Rationale**:
- Instant transitions (no loading spinner between maps)
- Better UX than server-side rendering
- React state handles current location + map index
- Breadcrumb array stored in state for back navigation
- Preload child location maps when parent map loads (prefetch optimization)

**Alternatives Considered**:
- Server-side routing: Rejected - slower transitions, full page reloads
- URL-based navigation: Rejected - complicates back button, unnecessary for prototype
- No preloading: Rejected - causes loading spinners on every pin click

**Implementation Notes**:
```typescript
interface NavigatorState {
  currentLocationId: string | null;
  currentMapIndex: number;
  breadcrumb: Array<{locationId: string; mapIndex: number}>;
  preloadedMaps: Record<string, MapData[]>; // locationId -> maps
}

function handlePinClick(pin: MapPin) {
  if (pin.linked_entity_type === 'location') {
    // Push to breadcrumb
    setBreadcrumb([...breadcrumb, {locationId: currentLocationId, mapIndex: currentMapIndex}]);

    // Transition to linked location's first map
    setCurrentLocationId(pin.linked_entity_id);
    setCurrentMapIndex(0);

    // Preload child location maps
    const childLocations = getChildLocations(pin.linked_entity_id);
    childLocations.forEach(loc => preloadMaps(loc.id));
  }
}
```

- Back navigation: Pop from breadcrumb, restore previous location + map
- Breadcrumb click: Truncate breadcrumb to clicked index, jump to that location

### 7. Faction Region Drawing: Konva.js Polygon with Vertex Editing

**Decision**: Use Konva.Line with closed path for polygon regions, custom vertex editor

**Rationale**:
- Konva.Line supports arbitrary vertex arrays
- Closed path creates polygon visually
- Custom editor: Click to add vertex, drag to move vertex, right-click to delete vertex
- Simple data structure: Array of {x, y} points
- Fill + stroke for visual clarity (semi-transparent fill, solid stroke)

**Alternatives Considered**:
- Konva.Shape with custom sceneFunc: Rejected - more complex API, Line sufficient
- Third-party polygon editor: Rejected - adds dependency, simple custom editor works
- Freehand drawing: Rejected - harder to edit, less precise for territory boundaries

**Implementation Notes**:
```typescript
interface FactionRegion {
  id: string;
  vertices: Array<{x: number; y: number}>;
  faction_id: string;
  color: string; // Hex color
  label: string | null;
  z_order: number; // For overlapping regions
  created_at: number;
}

// Rendering
<Line
  points={region.vertices.flatMap(v => [v.x, v.y])} // [x1, y1, x2, y2, ...]
  closed={true}
  fill={hexToRgba(region.color, 0.3)} // 30% opacity
  stroke={region.color}
  strokeWidth={2}
  onClick={() => handleRegionClick(region)}
/>

// Editing mode: Show circles at each vertex
{region.vertices.map((vertex, i) => (
  <Circle
    key={i}
    x={vertex.x}
    y={vertex.y}
    radius={5}
    fill="white"
    stroke="black"
    draggable={true}
    onDragEnd={(e) => updateVertex(region.id, i, e.target.x(), e.target.y())}
  />
))}
```

- Add vertex: Click on region edge midpoint
- Delete vertex: Right-click on vertex circle (minimum 3 vertices)
- Overlapping regions: Sort by z_order, render lower z_order first

## Performance Considerations

### Map Loading Optimization

**Target**: <1s map load time for 5MB image + 100 pins

**Strategies**:
- Base64 decode on client-side (Web APIs fast for this)
- Konva.Image caching (don't recreate on re-render)
- React.memo on MapPin components (prevent unnecessary re-renders)
- Virtualization: Only render pins in visible viewport (if >1000 pins)
- Image compression: Encourage users to use compressed PNG/JPG

**Implementation**:
```typescript
const MapCanvas = React.memo(({ mapData, pins, regions }: Props) => {
  const imageRef = useRef<Konva.Image>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = mapData.data; // base64 data URL
  }, [mapData.id]);

  return (
    <Stage>
      <Layer>
        <Image image={image} />
      </Layer>
      <Layer>
        {regions.map(r => <FactionRegion key={r.id} region={r} />)}
      </Layer>
      <Layer>
        {pins.map(p => <MapPin key={p.id} pin={p} />)}
      </Layer>
    </Stage>
  );
});
```

### Pan/Zoom Performance

**Target**: 60fps pan/zoom interactions

**Strategies**:
- Konva.js uses requestAnimationFrame internally (optimized)
- Hardware acceleration via CSS transforms
- Debounce zoom events (200ms delay before re-rendering labels)
- Disable shadows and complex effects during drag (enable after dragend)
- Limit zoom range (0.1x to 5x)

**Implementation**:
```typescript
const [scale, setScale] = useState(1);
const [position, setPosition] = useState({x: 0, y: 0});

const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
  e.evt.preventDefault();

  const scaleBy = 1.1;
  const stage = e.target.getStage();
  const oldScale = stage.scaleX();
  const pointer = stage.getPointerPosition();

  const newScale = e.evt.deltaY > 0
    ? oldScale * scaleBy
    : oldScale / scaleBy;

  // Clamp scale
  const clampedScale = Math.max(0.1, Math.min(5, newScale));

  // Calculate new position to zoom toward mouse
  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  };

  const newPos = {
    x: pointer.x - mousePointTo.x * clampedScale,
    y: pointer.y - mousePointTo.y * clampedScale,
  };

  setScale(clampedScale);
  setPosition(newPos);
};
```

### Pin Click Response Time

**Target**: <500ms from pin click to entity detail page navigation

**Strategies**:
- No server round-trip (pin data already loaded with map)
- React Router navigation (client-side, instant)
- Prefetch entity data on pin hover (optimistic loading)
- Konva.js click events fire immediately (no lag)

**Implementation**:
```typescript
const MapPin = React.memo(({ pin, onClick }: Props) => {
  const [hovered, setHovered] = useState(false);
  const { prefetch } = useEntityPrefetch();

  return (
    <>
      <Circle
        x={pin.x}
        y={pin.y}
        radius={8}
        fill={pin.color || '#FF0000'}
        stroke="#FFFFFF"
        strokeWidth={2}
        onClick={() => onClick(pin)}
        onMouseEnter={() => {
          setHovered(true);
          prefetch(pin.linked_entity_type, pin.linked_entity_id);
        }}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'pointer' }}
      />
      {hovered && (
        <Text
          x={pin.x + 12}
          y={pin.y - 10}
          text={pin.label || 'Unknown'}
          fontSize={14}
          fill="#000000"
          padding={4}
          background="#FFFFFF"
        />
      )}
    </>
  );
});
```

## Best Practices

### Component Organization

**Practice**: Group map components in `components/maps/` directory

**Rationale**:
- Clear separation from location components
- All map-related UI in one place
- Easy to find and refactor

**Structure**:
```
frontend/src/components/maps/
├── MapCanvas.tsx         # Konva Stage wrapper
├── MapPin.tsx            # Pin component
├── FactionRegion.tsx     # Region polygon
├── MapControls.tsx       # Pan/zoom controls UI
├── PinEditor.tsx         # Pin creation modal
├── RegionEditor.tsx      # Region drawing tool
└── MapUploader.tsx       # Image upload component
```

### Information Filtering Integration

**Practice**: Apply filtering at data fetch layer, not render layer

**Rationale**:
- Consistent with Feature 004 patterns
- Backend filters before sending to frontend
- Frontend defense-in-depth: Strip dm_* fields if present
- Prevents accidental leaks in component logic

**Implementation**:
```typescript
// Hook automatically applies X-View-Mode header
function useLocationMaps(locationId: string) {
  const { viewMode } = useViewMode();

  return useQuery({
    queryKey: ['location-maps', locationId, viewMode],
    queryFn: async () => {
      const response = await apiClient.get(`/locations/${locationId}/maps`, {
        headers: { 'X-View-Mode': viewMode }
      });

      // Backend already filtered pins/regions by linked entity visibility
      return response.data;
    }
  });
}

// Component just renders what it receives
function MapCanvas({ mapData }: Props) {
  // mapData.pins already filtered (no dm_only entities)
  return (
    <Stage>
      {mapData.pins.map(pin => <MapPin pin={pin} />)}
    </Stage>
  );
}
```

### Error Handling

**Practice**: Graceful degradation for missing maps, orphaned pins, invalid coordinates

**Rationale**:
- Users may delete linked entities (orphaned pins)
- Pins may be positioned out of bounds
- Map images may fail to load
- Show helpful errors, don't crash

**Implementation**:
```typescript
// Orphaned pin (linked entity deleted)
function MapPin({ pin }: Props) {
  const entity = useEntity(pin.linked_entity_type, pin.linked_entity_id);

  if (!entity) {
    return (
      <Group>
        <Circle x={pin.x} y={pin.y} fill="#CCCCCC" opacity={0.5} />
        <Text x={pin.x} y={pin.y - 20} text="[Deleted]" fill="#888888" />
      </Group>
    );
  }

  return <Circle x={pin.x} y={pin.y} fill={pin.color} onClick={...} />;
}

// Out of bounds pin
function validatePinCoordinates(pin: MapPin, imageWidth: number, imageHeight: number): ValidationResult {
  if (pin.x < 0 || pin.x > imageWidth || pin.y < 0 || pin.y > imageHeight) {
    return { valid: false, error: `Pin coordinates (${pin.x}, ${pin.y}) out of bounds` };
  }
  return { valid: true };
}

// Map image load error
function MapCanvas({ mapData }: Props) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onerror = () => setImageError(true);
    img.onload = () => setImage(img);
    img.src = mapData.data;
  }, [mapData]);

  if (imageError) {
    return <div>Failed to load map image. Try re-uploading.</div>;
  }

  return <Stage>...</Stage>;
}
```

### TypeScript Type Safety

**Practice**: Define strict types for all map data structures

**Example**:
```typescript
// frontend/src/types/maps.ts
interface MapData {
  id: string;
  location_id: string;
  name: string;
  data: string; // base64 data URL
  width: number;
  height: number;
  uploaded_at: number;
}

interface MapPin {
  id: string;
  map_id: string;
  x: number;
  y: number;
  linked_entity_type: 'location' | 'npc';
  linked_entity_id: string;
  icon: PinIconType | null;
  color: string | null;
  label: string | null;
  created_at: number;
}

type PinIconType = 'castle' | 'city' | 'town' | 'village' | 'dungeon' | 'cave' | 'mountain' | 'forest' | 'desert' | 'water' | 'landmark' | 'temple' | 'tower' | 'port' | 'bridge' | 'ruins' | 'camp' | 'mine' | 'farm' | 'other';

interface FactionRegion {
  id: string;
  map_id: string;
  vertices: Array<{x: number; y: number}>;
  faction_id: string;
  color: string;
  label: string | null;
  z_order: number;
  created_at: number;
}

interface LocationTreeNode {
  location: Location;
  children: LocationTreeNode[];
  depth: number;
  hasMap: boolean;
  hasCycle: boolean; // True if cycle detected in parent chain
}
```

## Open Questions

**None** - All Technical Context items specified, no NEEDS CLARIFICATION markers remaining.

## References

- Feature 007 spec: Interactive maps for wiki cards (Konva.js usage established)
- Feature 014 spec: Location category database and parent_location_id hierarchy
- Feature 015 research: Dashboard widget system and react-grid-layout patterns
- Feature 004 spec: Information filtering with X-View-Mode header
- Konva.js docs: https://konvajs.org/docs/
- react-konva docs: https://konvajs.org/docs/react/
- react-grid-layout docs: https://github.com/react-grid-layout/react-grid-layout

---

**Status**: ✅ Research complete - All decisions documented, ready for Phase 1 (Design & Contracts)
