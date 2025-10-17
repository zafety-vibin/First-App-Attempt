# Political-Web Memory: Future View Modes

**Status:** Design document for future implementation
**Current:** Hierarchy circular view (Ring 0-3 with expand/collapse)
**Future:** Image-based map view, war game simulations

---

## **View Mode 1: Hierarchy Circular View (Current - In Progress)**

**Status:** ~80% complete

**What Works:**
- Ring system (0-50px Party, 75-125px Factions, 150-250px NPCs by type)
- Expand/collapse factions
- Multi-leader edge bundling
- Text-on-path labels
- Smart collision with faction-aware spacing

**Remaining Work:**
1. ✅ Zoom adjustment (1.1 → 1.25)
2. ⏳ Add hierarchy ring (leader → lieutenant → member, not just leader → member)
3. ⏳ Port World-Foundations metaballs (field strength, winner-takes-all)
4. ⏳ Purge database, load custom political-web data
5. ⏳ Add NPC:minor data (test actual hierarchy)
6. ⏳ Character generator/template nodes

---

## **View Mode 2: Image-Based Territory Map (Future)**

### **Concept:**
Political map with uploaded background image. Factions define territory via point-based shapes. NPCs placed at physical locations. Supports contested territory (no winner-takes-all).

### **Core Features:**

**1. Background Image Upload**
- High-quality map image (city map, continent, building floor plan)
- Canvas layer with pan/zoom
- Coordinate system maps graph space → image pixels

**2. Faction Territory Shapes**
- User-defined polygon shapes (click to place vertices)
- Each faction has one or more territory shapes
- Shape outline width = faction power level (dynamic borders)
- **NO metaball winner-takes-all** - overlapping territories allowed (contested zones)
- Semi-transparent fill shows faction control

**3. NPC Physical Placement**
- Drag NPCs onto map at actual locations
- No need to store "location" field - visual position is the data
- NPCs inherit faction from territory they're placed in (or manual override)

**4. Proximity-Based Visibility**
- Place PCs on map
- Only show NPCs/connections within X mile radius of party
- Configurable range (travel distance, communication range)
- Pin functionality: pinned NPCs always visible regardless of distance

**5. Territory Expansion Mechanics**
- Faction power level slider (1-10)
- Power affects:
  - Border outline thickness (1 = thin, 10 = thick bold borders)
  - Territory shape size (optional: can grow/shrink shape)
  - Combat strength in war game mode

**6. Metaballs for Expeditionary Forces**
- NPCs placed OUTSIDE faction home territory show metaballs
- NPCs along borders trying to expand show influence spheres
- Home territory uses defined shapes, expansion uses metaballs

**7. War Game Simulation Mode**
- Assign power levels to factions
- Run simulation: contested territories resolve based on:
  - NPC count in region
  - Faction power level
  - Terrain (if map has elevation/features)
- Visualize territorial gains/losses over time

**8. Scale and Legend**
- Map scale indicator (1 inch = X miles)
- Legend shows faction colors and power levels
- Grid overlay option (hex grid, square grid)

---

### **Data Model:**

**Faction Territory Shape:**
```typescript
{
  id: uuid,
  faction_id: uuid,
  shape_type: 'polygon' | 'circle' | 'freeform',
  vertices: [{x: number, y: number}], // Map coordinates
  power_level: 1-10,
  is_contested: boolean,
  created_at: timestamp
}
```

**NPC Map Placement:**
```typescript
{
  npc_id: uuid,
  map_x: number, // Pixel coordinates on image
  map_y: number,
  is_pinned: boolean, // Always visible regardless of PC proximity
  last_seen: timestamp // For "where were they last"
}
```

**Map Metadata:**
```typescript
{
  id: uuid,
  campaign_id: uuid,
  image_path: string,
  image_width: number,
  image_height: number,
  scale_info: string, // "1 inch = 10 miles"
  grid_enabled: boolean,
  grid_size: number
}
```

---

### **UI/UX:**

**Mode Switcher:**
- Toggle button: "Hierarchy View" ↔ "Territory Map View"
- Same graph data, different visualizations

**Territory Editing:**
- Click "Define Territory" → enter polygon mode
- Click vertices to define shape
- Right-click to close polygon
- Drag vertices to adjust

**NPC Placement:**
- Drag NPCs from sidebar onto map
- Snap to grid (if enabled)
- Context menu: "Remove from map", "Pin location"

**Power Level Control:**
- Slider per faction (1-10)
- Real-time border thickness update
- Optional: faction shape grows/shrinks

---

### **Technical Implementation:**

**Canvas Layers:**
1. **Background:** Uploaded image
2. **Territories:** Faction shape fills + borders
3. **Metaballs:** Expeditionary forces only
4. **Nodes:** NPC positions
5. **Edges:** Proximity-filtered connections
6. **UI:** Grid, scale, legend

**Proximity Filtering:**
```typescript
const PC_PROXIMITY_RADIUS = 100; // miles or map units
const visibleNPCs = allNPCs.filter(npc => {
  if (npc.is_pinned) return true;
  const distanceToParty = calculateDistance(npc.position, pcPosition);
  return distanceToParty <= PC_PROXIMITY_RADIUS;
});
```

**Contested Territory Detection:**
```typescript
// For each point on map, check which faction shapes contain it
const contestedZones = findOverlappingShapes(factionShapes);
// Render with striped pattern or color blend
```

---

### **Integration with Existing System:**

**Same Data, Different Views:**
- Political-Web graph stores factions + NPCs + relationships
- Hierarchy view: circular layout with rings
- Territory view: spatial layout on map image
- Both views use same database tables

**Switch Between Views:**
- Button toggles between modes
- Preserves expanded/collapsed state
- Preserves selected nodes

**Character Generator Templates:**
- Work in both views
- Hierarchy view: shows as special node type
- Territory view: shows as factory icon on map

---

## **Character Generator / Faction Templates (Both Views)**

### **Concept:**
Lowest-rank "NPC" is actually a **template/generator** that produces random commoners on demand.

### **Template Node Structure:**

```typescript
{
  id: uuid,
  node_type: 'CharacterGenerator',
  faction: 'Sablemarrow Council',
  template_name: 'Council Commoner',
  population_count: 500, // How many commoners this represents

  // Generator config
  name_pools: {
    first_names: ['Aldric', 'Brina', 'Cael', ...],
    last_names: ['Stonehelm', 'Ironforge', ...],
    use_puns: true,
    use_fantasy_generator: true
  },

  // Restrictions
  race_restrictions: {
    allowed: ['Human', 'Dwarf', 'Halfling'],
    forbidden: ['Orc', 'Goblin'], // Due to faction prejudice
    description: 'Council is racist, no greenskins'
  },

  // Skills and training
  basic_skills: ['City Watch protocols', 'Basic combat'],
  common_equipment: ['Spear', 'Chain mail', 'Council tabard'],

  // Faction culture
  hierarchy_type: 'bureaucratic', // or 'military', 'flat', 'tribal'
  hierarchy_levels: ['Councilor', 'Captain', 'Sergeant', 'Guard'],
  recruitment: 'Open to citizens, 2 year term',

  // Human elements
  daily_life: 'Patrol the markets, collect taxes, break up fights',
  motivations: 'Paycheck, civic duty, fear of superiors',
  rumors: ['Guards take bribes', 'Secret resistance sympathizers']
}
```

### **Generator UI:**

**Expand Template Node:**
- Shows modal/panel with generator interface
- Button: "Generate Random Commoner"
- Form: Can override defaults (pick specific race, add custom name)

**Generated Result:**
```json
{
  "name": "Aldric Stonehelm",
  "race": "Dwarf",
  "role": "Guard",
  "faction": "Sablemarrow Council",
  "level": 1,
  "equipment": ["Spear", "Chain mail", "Council tabard"],
  "personality": "Gruff but fair, takes bribes reluctantly"
}
```

**Promotion to Full NPC:**
- Button: "Make Permanent" → Creates real NPC node in database
- Links to parent template
- Appears in both hierarchy and map views

### **Visual Representation:**

**Hierarchy View:**
- Template shows as special icon (factory/generator symbol)
- Displays population count (500 commoners)
- Ring 4 (furthest out) - lowest rank

**Map View:**
- Shows as distributed cluster/heatmap
- Click → generates specific individual from that location

---

## **Next Steps (Priority Order):**

### **Immediate (Complete Hierarchy View):**
1. ✅ Commit current state
2. ⏳ Zoom: 1.1 → 1.25
3. ⏳ Add Ring 2: Lieutenant level (100-150px between leader and member)
4. ⏳ Port WF metaballs
5. ⏳ Purge database, load custom political-web data
6. ⏳ Add NPC:minor data
7. ⏳ Test 3-tier hierarchy (leader → lieutenant → member)
8. ⏳ Character generator template MVP

### **Future (Image Territory View):**
1. Image upload infrastructure
2. Shape definition tools (polygon drawing)
3. NPC drag-and-drop placement
4. Proximity filtering
5. Contested territory rendering
6. Power level mechanics

### **Long-term (War Game Mode):**
1. Faction power simulation
2. Territory expansion algorithms
3. Timeline playback (show territorial changes over time)

---

**This document captures future vision while keeping focus on current work.**
