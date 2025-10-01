# Research: Interactive Map System

**Feature**: 007-create-the-interactive
**Date**: 2025-10-01
**Phase**: Phase 0 (Outline & Research)

## Research Topic 1: Canvas Libraries for React

**Decision**: Use Konva.js with react-konva wrapper

**Rationale**:
- Konva.js provides high-level canvas API with built-in support for shapes, transformations, and event handling
- react-konva offers declarative React component API (Stage, Layer, Image, Circle, Line, etc.)
- Excellent zoom/pan performance with built-in scaling transforms
- Drag-and-drop functionality built-in for pin repositioning
- Active maintenance and good documentation
- Handles 500+ shapes efficiently with layer caching

**Alternatives Considered**:
- **Fabric.js**: More features but heavier bundle size, less React-idiomatic integration
- **Canvas API directly**: Too low-level for complex interactions (drag-drop, zoom, events)
- **SVG-based (react-svg-pan-zoom)**: Performance degrades with 500+ elements, not ideal for large maps

**Implementation**:
```typescript
// Example Konva setup
import { Stage, Layer, Image as KonvaImage, Circle, Text } from 'react-konva';

<Stage width={800} height={600} scaleX={scale} scaleY={scale}>
  <Layer>
    <KonvaImage image={mapBackgroundImage} />
    {pins.map(pin => (
      <Group key={pin.id} x={pin.x} y={pin.y} draggable onDragEnd={handlePinMove}>
        <Circle radius={10} fill="red" />
        <Text text={pin.label} />
      </Group>
    ))}
  </Layer>
</Stage>
```

---

## Research Topic 2: Image Storage Patterns in SQLite

**Decision**: Store images as BLOBs in SQLite with client-side compression

**Rationale**:
- Single-user local deployment benefits from single-file database (no external file management)
- SQLite BLOB storage handles multi-MB images efficiently with WAL mode
- Simplifies backup/restore (entire campaign in one .db file)
- Client-side compression (browser Canvas API) reduces upload size before sending to backend
- Prototype-first approach prioritizes simplicity over optimization

**Alternatives Considered**:
- **File system storage**: More traditional but requires file path management, backup complexity, Docker volume mapping
- **Base64 encoding in JSON**: Inefficient storage (33% overhead), poor query performance
- **Server-side compression**: Adds complexity, client-side sufficient for prototype

**Implementation**:
```typescript
// Backend schema
CREATE TABLE map_images (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  map_name TEXT NOT NULL,
  image_data BLOB NOT NULL,
  image_width INTEGER NOT NULL,
  image_height INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at INTEGER NOT NULL,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

// Client-side compression before upload
const compressImage = async (file: File): Promise<Blob> => {
  const img = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.85));
};
```

**Size Limits**: 10MB upload limit (reasonable for most map images), reject larger files with error

---

## Research Topic 3: Coordinate System Design

**Decision**: Absolute pixel coordinates with viewport-independent rendering

**Rationale**:
- Absolute pixel coordinates (x, y integers relative to image dimensions) ensure pins stay at exact locations
- Coordinates stored independently of viewport zoom/scale
- Rendering applies zoom transform to entire canvas, preserving relative positions
- Simple to implement: no complex coordinate transformations needed
- Integer precision sufficient for pixel-level accuracy

**Alternatives Considered**:
- **Percentage-based coordinates**: More resilient to image resize but floating-point precision issues, complex UI calculations
- **Relative to viewport**: Breaks when zooming/panning, not suitable for persistent storage
- **Grid-based coordinates**: Too restrictive, doesn't support free positioning

**Implementation**:
```typescript
interface PinCoordinates {
  x: number; // Absolute pixel X from top-left of image
  y: number; // Absolute pixel Y from top-left of image
}

// Storage (SQLite)
CREATE TABLE pins (
  id TEXT PRIMARY KEY,
  map_image_id TEXT NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  -- x and y are pixel coordinates relative to map image dimensions
  FOREIGN KEY (map_image_id) REFERENCES map_images(id) ON DELETE CASCADE
);

// Rendering (applies zoom scale to entire Stage)
<Stage scale={{ x: zoomLevel, y: zoomLevel }}>
  <Layer>
    {pins.map(pin => (
      <Circle x={pin.x} y={pin.y} radius={10} />
    ))}
  </Layer>
</Stage>
```

**Coordinate Validation**: Warn user if pin placed outside image bounds (x < 0, x > image.width, y < 0, y > image.height), allow but show warning indicator

---

## Research Topic 4: Pin Visibility Inheritance

**Decision**: Server-side filtering using ViewModeService from Feature 004

**Rationale**:
- Reuse existing information level filtering infrastructure (Feature 004)
- Pin queries join with referenced card's information_level_id
- ViewModeService.filterCards() extended to handle pin filtering
- Server-side ensures security (client can't bypass filtering)
- Reactive updates: when referenced card's tag changes, pin visibility updates on next query

**Alternatives Considered**:
- **Client-side filtering only**: Security risk (Player View could be bypassed)
- **Duplicate information levels on pins**: Data denormalization, sync issues
- **Real-time websocket updates**: Over-engineering for prototype, polling on view mode change sufficient

**Implementation**:
```typescript
// Backend query with information filtering
const getPinsForMap = (mapId: string, viewMode: 'dm' | 'player'): Pin[] => {
  const query = `
    SELECT pins.*, cards.information_level_id
    FROM pins
    JOIN cards ON pins.referenced_card_id = cards.id
    WHERE pins.map_image_id = ?
  `;

  const pins = db.prepare(query).all(mapId);

  if (viewMode === 'player') {
    // Filter out pins referencing DM Secret cards
    return pins.filter(pin => {
      const level = getInformationLevel(pin.information_level_id);
      return level?.name !== 'DM Secret';
    });
  }

  return pins; // DM View shows all pins
};

// Visual indicator in DM View for hidden pins
<Circle
  fill={isHiddenInPlayerView ? 'rgba(255, 0, 0, 0.3)' : 'blue'}
  stroke={isHiddenInPlayerView ? 'red' : 'black'}
  strokeWidth={isHiddenInPlayerView ? 2 : 1}
/>
```

**Cascade Updates**: When referenced card deleted, pin becomes orphaned (see Topic 7 for warning handling)

---

## Research Topic 5: Multi-Map Tab Management

**Decision**: Use Radix UI Tabs component with independent map state

**Rationale**:
- Radix UI Tabs provides accessible, unstyled tab component compatible with existing stack
- Already using Radix UI in Feature 005 (Pull-down tab UI for Import/Planning AI)
- Each map image has independent pins/zones/layers (separate database queries per map_image_id)
- Tab switching triggers new data fetch for selected map
- Prototype accepts slight load delay on tab switch (< 500ms acceptable)

**Alternatives Considered**:
- **Custom tab component**: Reinventing wheel, accessibility concerns
- **Preload all maps**: Memory overhead with 10+ maps per card
- **Single shared pin/zone state**: Complex filtering logic, data conflicts

**Implementation**:
```typescript
import * as Tabs from '@radix-ui/react-tabs';

<Tabs.Root value={activeMapId} onValueChange={setActiveMapId}>
  <Tabs.List>
    {mapImages.map(map => (
      <Tabs.Trigger key={map.id} value={map.id}>
        {map.map_name}
      </Tabs.Trigger>
    ))}
  </Tabs.List>

  {mapImages.map(map => (
    <Tabs.Content key={map.id} value={map.id}>
      <MapCanvas mapId={map.id} />
    </Tabs.Content>
  ))}
</Tabs.Root>

// Fetch pins/zones/layers only for active map
const { data: pins } = useQuery(['pins', activeMapId], () =>
  fetchPins(activeMapId)
);
```

**Tab Ordering**: User-defined via drag-and-drop (deferred to post-prototype, initial order by creation timestamp)

---

## Research Topic 6: Polygon Drawing for Zones

**Decision**: Click-to-add-vertex drawing with Konva Line component

**Rationale**:
- Konva Line component with `closed: true` renders polygons
- Click-to-add-vertex interaction: each click adds vertex to polygon coordinate array
- Double-click or "Finish Zone" button to complete polygon
- Color picker via react-color for user-defined zone colors
- Semi-transparent fill with `opacity: 0.3` for overlay rendering

**Alternatives Considered**:
- **Freehand drawing**: Too imprecise for defining zones, hard to edit
- **Rectangle/circle only**: Too restrictive, doesn't match district/area shapes
- **SVG polygon**: Less performant than Konva canvas rendering

**Implementation**:
```typescript
import { Line } from 'react-konva';
import { ChromePicker } from 'react-color';

// Zone polygon rendering
<Line
  points={zone.coordinates.flatMap(coord => [coord.x, coord.y])}
  closed
  fill={zone.color}
  opacity={0.3}
  stroke={zone.color}
  strokeWidth={2}
/>

// Drawing mode: accumulate vertices on click
const handleCanvasClick = (e: KonvaEventObject<MouseEvent>) => {
  if (drawingMode === 'zone') {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    setZoneVertices([...zoneVertices, { x: point.x, y: point.y }]);
  }
};

// Storage
CREATE TABLE zones (
  id TEXT PRIMARY KEY,
  map_image_id TEXT NOT NULL,
  coordinates TEXT NOT NULL, -- JSONB array of {x, y}
  zone_color TEXT NOT NULL, -- hex color code
  zone_purpose TEXT,
  metadata TEXT, -- JSONB optional
  FOREIGN KEY (map_image_id) REFERENCES map_images(id) ON DELETE CASCADE
);
```

**Polygon Editing**: Post-prototype feature (vertex drag-and-drop), initial version is create/delete only

---

## Research Topic 7: Nested Map Navigation

**Decision**: Breadcrumb navigation with browser history integration, no circular reference prevention

**Rationale**:
- Breadcrumb component shows navigation path (World > Waterdeep > Castle Ward)
- Browser back button navigates to previous map (React Router integration)
- No circular reference detection for prototype (acceptable per user clarification Q5)
- Parent-child relationship preserved via existing card hierarchy (Feature 003)
- Navigation is simple card routing: click pin → navigate to card page → if card has map, show "Enter Map" button

**Alternatives Considered**:
- **Circular reference detection**: Over-engineering for prototype, users responsible for avoiding loops
- **Modal-based navigation**: Breaks browser history, poor UX for deep nesting
- **Separate navigation stack**: Complex state management, browser history simpler

**Implementation**:
```typescript
// Breadcrumb component
const MapBreadcrumbs: React.FC = () => {
  const navigate = useNavigate();
  const navigationPath = useMapNavigationPath(); // Hook tracks card navigation history

  return (
    <nav>
      {navigationPath.map((card, index) => (
        <Fragment key={card.id}>
          <button onClick={() => navigate(`/cards/${card.id}`)}>
            {card.title}
          </button>
          {index < navigationPath.length - 1 && <span> > </span>}
        </Fragment>
      ))}
    </nav>
  );
};

// Pin click navigation
const handlePinClick = (pin: Pin) => {
  navigate(`/cards/${pin.referenced_card_id}`);
  // If referenced card has map_enabled, show "Enter Map" button on card page
};

// Orphaned pin warning (when referenced card deleted)
const OrphanedPinWarning: React.FC<{ pin: Pin }> = ({ pin }) => {
  return (
    <div className="warning">
      Pin "{pin.label}" references a deleted card.
      <button onClick={() => deletePin(pin.id)}>Delete Pin</button>
      <button onClick={() => openPinEditor(pin.id)}>Update Reference</button>
    </div>
  );
};
```

**Performance Consideration**: No depth limit for nested navigation in prototype (acceptable load times for 5+ levels)

---

## Summary of Decisions

| Topic | Decision | Key Rationale |
|-------|----------|---------------|
| Canvas Library | Konva.js + react-konva | High performance, React-idiomatic, drag-drop built-in |
| Image Storage | SQLite BLOB + client compression | Single-file database, simple backup, prototype-first |
| Coordinates | Absolute pixel integers | Exact positioning, no transform complexity |
| Pin Visibility | ViewModeService integration | Reuse Feature 004, server-side security |
| Multi-Map Tabs | Radix UI Tabs | Accessible, consistent with Feature 005 |
| Polygon Drawing | Konva Line + click-to-add-vertex | Flexible shapes, user-defined colors |
| Nested Navigation | Breadcrumbs + browser history | Simple routing, no circular detection needed |

---

## Dependencies & Prerequisites

- **Feature 003** (Card-Based Architecture): Maps extend Card entity, modular parent-child relationships
- **Feature 004** (Information Filtering): Pin visibility inherits from referenced card tags
- **Frontend Libraries**: Konva.js, react-konva, react-color, Radix UI Tabs
- **Backend Libraries**: multer (file uploads), Sharp (optional image optimization, deferred)

---

## Performance Expectations (Prototype)

- Map image upload (5MB): < 1s with client-side compression
- Pin add/move operation: < 100ms (Konva handles efficiently)
- Zoom/pan at 60fps: Konva Layer caching enables smooth performance
- 500+ pins per map: Acceptable with layer caching, may add virtual viewport clipping post-prototype
- Tab switching: < 500ms load time (fetch pins/zones/layers for new map)

---

**Phase 0 Complete**: All research decisions documented. Ready for Phase 1 (Design & Contracts).
