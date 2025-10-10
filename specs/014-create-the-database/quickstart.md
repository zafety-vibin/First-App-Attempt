# Quickstart: Structured Category Database Foundation

**Feature**: 014-create-the-database
**Date**: 2025-01-10
**Estimated Time**: 15 minutes

## Overview

This quickstart validates Feature 014 by creating 13 category databases, testing CRUD operations, verifying information level filtering, and exploring explicit connections and custom field definitions.

## Prerequisites

- Feature 002 (Authentication) running: `docker-compose up`
- Feature 004 (Information Levels) database tables exist
- Backend tests passing: `cd backend && npm test`
- Valid Keycloak user token

## Environment Setup

```bash
# 1. Start all services
docker-compose up --build

# 2. Verify backend database migration completed
docker-compose logs backend | grep "014-category-tables"

# Expected output:
# backend_1  | [Migration] Running migration: 014-category-tables.sql
# backend_1  | [Migration] ✓ 014-category-tables.sql completed

# 3. Open new terminal for API testing
export API_URL="http://localhost:3001"
export TOKEN="<your_keycloak_token>"  # From POST /auth/login

# Quick token test
curl -H "Authorization: Bearer $TOKEN" $API_URL/campaigns
```

## Test Scenario 1: NPCs with Hierarchy

**User Story**: As a GM, I want to create NPCs with organizational hierarchy (chain of command) so I can track who serves whom.

```bash
# 1. Create a campaign
CAMPAIGN_ID=$(curl -X POST $API_URL/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Campaign", "system": "D&D 5e"}' \
  | jq -r '.id')

echo "Campaign ID: $CAMPAIGN_ID"

# 2. Create a faction (for NPC organization)
FACTION_ID=$(curl -X POST $API_URL/factions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "'$CAMPAIGN_ID'",
    "name": "Thieves Guild",
    "faction_type": "guild",
    "player_knowledge": "common_knowledge"
  }' | jq -r '.id')

# 3. Create superior NPC (guild leader)
LEADER_ID=$(curl -X POST $API_URL/npcs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "'$CAMPAIGN_ID'",
    "name": "Shadowmaster Vex",
    "race": "Half-Elf",
    "class": ["Rogue"],
    "level": 15,
    "faction_id": "'$FACTION_ID'",
    "met_party": 0,
    "player_knowledge": "player_knowledge",
    "dm_secrets": "Actually a copper dragon in disguise"
  }' | jq -r '.id')

echo "Leader NPC ID: $LEADER_ID"

# 4. Create subordinate NPC (reports to leader)
SUBORDINATE_ID=$(curl -X POST $API_URL/npcs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "'$CAMPAIGN_ID'",
    "name": "Fingers McGee",
    "race": "Halfling",
    "class": ["Rogue"],
    "level": 5,
    "faction_id": "'$FACTION_ID'",
    "superior_npc_id": "'$LEADER_ID'",
    "met_party": 1,
    "player_knowledge": "common_knowledge"
  }' | jq -r '.id')

# 5. Query hierarchy (get all subordinates of leader)
curl "$API_URL/npcs?campaign_id=$CAMPAIGN_ID&superior_npc_id=$LEADER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected: Returns Fingers McGee

# 6. Get NPC with superior details
curl "$API_URL/npcs/$SUBORDINATE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.superior_npc_id'

# Expected: Returns $LEADER_ID
```

**Validation**:
- ✅ NPCs created with hierarchy relationship
- ✅ Reverse lookup finds subordinates
- ✅ `superior_npc_id` correctly links subordinate to leader

## Test Scenario 2: Information Level Filtering

**User Story**: As a GM, I want DM-only NPC secrets hidden in player view but visible in DM view.

```bash
# 1. Get NPC in DM view (default)
curl "$API_URL/npcs/$LEADER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-View-Mode: dm_view" | jq '.dm_secrets'

# Expected: "Actually a copper dragon in disguise"

# 2. Get NPC in player view (dm_secrets stripped)
curl "$API_URL/npcs/$LEADER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-View-Mode: player_view" | jq '.dm_secrets'

# Expected: null (field stripped by middleware)

# 3. Create dm_only NPC (invisible to players)
DM_ONLY_ID=$(curl -X POST $API_URL/npcs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "'$CAMPAIGN_ID'",
    "name": "Secret Informant",
    "player_knowledge": "dm_only"
  }' | jq -r '.id')

# 4. List NPCs in player view (dm_only excluded)
curl "$API_URL/npcs?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-View-Mode: player_view" | jq 'length'

# Expected: 2 (Vex and Fingers, but NOT Secret Informant)

# 5. List NPCs in DM view (all included)
curl "$API_URL/npcs?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-View-Mode: dm_view" | jq 'length'

# Expected: 3 (all NPCs visible)

# 6. Test null information level (freely accessible)
NULL_INFO_ID=$(curl -X POST $API_URL/npcs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "'$CAMPAIGN_ID'",
    "name": "Mysterious Stranger",
    "player_knowledge": null
  }' | jq -r '.id')

curl "$API_URL/npcs?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-View-Mode: player_view" | jq '.[] | select(.id == "'$NULL_INFO_ID'") | .name'

# Expected: "Mysterious Stranger" (null = included in player view, AI's discretion)
```

**Validation**:
- ✅ `dm_secrets` field stripped in player_view
- ✅ `player_knowledge: dm_only` entities excluded from player_view
- ✅ `player_knowledge: null` entities included in player_view (freely accessible)

## Test Scenario 3: Locations with Maps

**User Story**: As a GM, I want to attach map images to locations and create location hierarchies.

```bash
# 1. Create parent location (continent)
CONTINENT_ID=$(curl -X POST $API_URL/locations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "'$CAMPAIGN_ID'",
    "name": "Faerun",
    "location_type": "continent",
    "map": "/maps/faerun.png"
  }' | jq -r '.id')

# 2. Create child location (city within continent)
CITY_ID=$(curl -X POST $API_URL/locations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "'$CAMPAIGN_ID'",
    "name": "Waterdeep",
    "location_type": "city",
    "population": 150000,
    "parent_location_id": "'$CONTINENT_ID'",
    "map": "/maps/waterdeep.png",
    "notable_npcs": ["'$LEADER_ID'", "'$SUBORDINATE_ID'"]
  }' | jq -r '.id')

# 3. Query location hierarchy (get all children of continent)
curl "$API_URL/locations?campaign_id=$CAMPAIGN_ID&parent_location_id=$CONTINENT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected: Returns Waterdeep

# 4. Verify map field
curl "$API_URL/locations/$CITY_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.map'

# Expected: "/maps/waterdeep.png"
```

**Validation**:
- ✅ Location hierarchy (parent/child) working
- ✅ `map` field stores file paths
- ✅ `notable_npcs` JSON array links to NPCs

## Test Scenario 4: Session Prep One-Way Linking

**User Story**: As a GM, I want session prep to reference canonical NPCs without creating reverse lookups.

```bash
# 1. Create session prep with one-way NPC references
PREP_ID=$(curl -X POST $API_URL/session-prep \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "'$CAMPAIGN_ID'",
    "name": "Session 5 Prep",
    "player_knowledge": "dm_only",
    "is_canon": 0,
    "canonical_status": "hypothetical",
    "npcs_to_prep": ["'$LEADER_ID'", "'$SUBORDINATE_ID'"],
    "dm_notes": "Guild heist encounter"
  }' | jq -r '.id')

# 2. Verify session prep player_knowledge locked to dm_only
curl "$API_URL/session-prep/$PREP_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.player_knowledge'

# Expected: "dm_only" (enforced at service layer)

# 3. Verify session prep invisible in player view
curl "$API_URL/session-prep?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-View-Mode: player_view" | jq 'length'

# Expected: 0 (all prep is dm_only)

# 4. Try to query NPCs with reverse reference to session prep (should fail)
curl "$API_URL/npcs/$LEADER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq 'has("session_prep_references")'

# Expected: false (no reverse lookup field exists)

# 5. Delete canonical NPC (session prep reference becomes stale, acceptable)
curl -X DELETE "$API_URL/npcs/$SUBORDINATE_ID" \
  -H "Authorization: Bearer $TOKEN"

curl "$API_URL/session-prep/$PREP_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.npcs_to_prep'

# Expected: ["$LEADER_ID", "$SUBORDINATE_ID"] (stale ID remains, no ON DELETE CASCADE)
```

**Validation**:
- ✅ Session prep references canonical NPCs via JSON array
- ✅ No reverse lookup from NPCs to session prep
- ✅ `player_knowledge` always `dm_only` for session prep
- ✅ Stale IDs acceptable (hypothetical content)

## Test Scenario 5: Custom Field Definitions

**User Story**: As a GM, I want to define custom fields with validation schemas.

```bash
# 1. Create custom field definition for NPCs
FIELD_DEF_ID=$(curl -X POST $API_URL/custom-field-definitions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "'$CAMPAIGN_ID'",
    "category": "npcs",
    "field_name": "magicalAffinity",
    "field_label": "Magical Affinity",
    "field_type": "select",
    "options": ["Fire", "Ice", "Lightning", "None"]
  }' | jq -r '.id')

# 2. Create NPC with custom field
CUSTOM_NPC_ID=$(curl -X POST $API_URL/npcs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "'$CAMPAIGN_ID'",
    "name": "Pyromancer Zara",
    "class": ["Sorcerer"],
    "custom_fields": {
      "magicalAffinity": "Fire"
    }
  }' | jq -r '.id')

# 3. Query NPCs by custom field (JSON1 extension)
curl "$API_URL/npcs?campaign_id=$CAMPAIGN_ID&custom_field=magicalAffinity&custom_value=Fire" \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected: Returns Pyromancer Zara

# 4. Get custom field definition (for UI rendering)
curl "$API_URL/custom-field-definitions?campaign_id=$CAMPAIGN_ID&category=npcs" \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected: Returns magicalAffinity definition with options array

# 5. Try to create duplicate custom field definition (should fail)
curl -X POST $API_URL/custom-field-definitions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "'$CAMPAIGN_ID'",
    "category": "npcs",
    "field_name": "magicalAffinity",
    "field_label": "Different Label",
    "field_type": "text"
  }'

# Expected: 409 Conflict (UNIQUE constraint on campaign_id + category + field_name)
```

**Validation**:
- ✅ Custom field definitions created with schema metadata
- ✅ NPCs use custom fields via `custom_fields` JSON column
- ✅ JSON1 queries filter by custom field values
- ✅ UNIQUE constraint prevents duplicate field definitions

## Test Scenario 6: Planar Forces with Base of Power

**User Story**: As a GM, I want to track deities and their sources of power.

```bash
# 1. Create planar force (deity) with base_of_power
DEITY_ID=$(curl -X POST $API_URL/planar-forces \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "'$CAMPAIGN_ID'",
    "name": "Bahamut",
    "entity_type": "deity",
    "domains": ["War", "Good", "Dragons"],
    "alignment": "Lawful Good",
    "plane_of_origin": "Mount Celestia",
    "base_of_power": "Worship",
    "worshiper_base": "Paladins and Metallic Dragons"
  }' | jq -r '.id')

# 2. Verify base_of_power field
curl "$API_URL/planar-forces/$DEITY_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.base_of_power'

# Expected: "Worship"
```

**Validation**:
- ✅ Planar forces created with `base_of_power` field
- ✅ `domains` JSON array stores multiple domains

## Test Scenario 7: Player Characters with Art

**User Story**: As a GM, I want to attach character portraits to PCs.

```bash
# 1. Create player character with art
PC_ID=$(curl -X POST $API_URL/player-characters \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "'$CAMPAIGN_ID'",
    "name": "Elara Brightblade",
    "player_name": "Alice",
    "class": ["Paladin"],
    "level": 7,
    "race": "Human",
    "art": "/portraits/elara.jpg"
  }' | jq -r '.id')

# 2. Verify art field
curl "$API_URL/player-characters/$PC_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.art'

# Expected: "/portraits/elara.jpg"
```

**Validation**:
- ✅ Player characters created with `art` field
- ✅ File path stored for character portraits

## Test Scenario 8: Lore Entries with Historical Accuracy

**User Story**: As a GM, I want to track whether lore is true, exaggerated, or false legend.

```bash
# 1. Create lore entry with historical_accuracy
LORE_ID=$(curl -X POST $API_URL/lore-entries \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "'$CAMPAIGN_ID'",
    "name": "The Dragon War",
    "category": "history",
    "era_period": "Age of Dragons",
    "historical_accuracy": "Exaggerated",
    "description": "Legends say dragons once ruled all kingdoms..."
  }' | jq -r '.id')

# 2. Verify historical_accuracy field
curl "$API_URL/lore-entries/$LORE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.historical_accuracy'

# Expected: "Exaggerated"
```

**Validation**:
- ✅ Lore entries created with `historical_accuracy` field
- ✅ Supports values like "True", "Exaggerated", "False Legend", "Unknown"

## Cleanup

```bash
# Delete test campaign (CASCADE deletes all category entities)
curl -X DELETE "$API_URL/campaigns/$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN"

# Verify all NPCs deleted
curl "$API_URL/npcs?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" | jq 'length'

# Expected: 0 (CASCADE delete removed all entities)
```

## Success Criteria

✅ **All 8 test scenarios pass**
✅ **13 category tables operational** (NPCs, Locations, Factions, Session Recaps, Quests, Player Characters, Lore Entries, World Rules, Planar Forces, Session Prep, Custom Mechanics, Items, Creatures)
✅ **Information level filtering works** (dm_view vs player_view, null handling)
✅ **Explicit foreign keys enforce referential integrity** (faction_id, superior_npc_id, parent_location_id)
✅ **Session prep one-way linking prevents reverse lookups**
✅ **Custom field definitions provide schema metadata**
✅ **New fields functional**: `met_party`, `art`, `superior_npc_id`, `map`, `base_of_power`, `historical_accuracy`

## Troubleshooting

**Issue**: Migration not applied
**Solution**: Check `docker-compose logs backend | grep Migration` for errors. Verify `backend/src/db/migrations/014-category-tables.sql` exists.

**Issue**: 401 Unauthorized
**Solution**: Refresh Keycloak token: `curl -X POST $API_URL/auth/login -d '{"username":"test","password":"test"}'`

**Issue**: Foreign key constraint failure
**Solution**: Verify parent entity exists before creating child. Check campaign_id, faction_id, superior_npc_id references.

**Issue**: dm_secrets not stripped in player_view
**Solution**: Verify `X-View-Mode: player_view` header sent. Check middleware order in `backend/src/index.ts`.

## Next Steps

- **Feature 015**: Dashboard UI for database table views
- **Feature 017**: AI Import workflow for bulk entity creation
- **Feature 018**: Planning AI integration with knowledge graphs

---

**Status**: ✅ Quickstart complete - Ready for implementation validation
