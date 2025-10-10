# Quickstart: Stateless AI Import System

**Feature**: 017-create-a-stateless
**Date**: 2025-01-10
**Estimated Time**: 25 minutes

## Overview

This quickstart validates Feature 017 by testing stateless AI import workflows across 6 manual scenarios covering type selection, preview editing, duplicate resolution, sequential batch import, cancellation, and text paste.

## Prerequisites

- Feature 002 (Authentication) running: `docker-compose up`
- Feature 004 (Information Levels) database tables exist
- Feature 008 (BYOLLM Configuration) configured with valid API credentials
- Feature 014 (13 Category Tables) database tables exist
- Backend tests passing: `cd backend && npm test`
- Valid Keycloak user token

## Environment Setup

```bash
# 1. Start all services
docker-compose up --build

# 2. Verify backend database migration completed
docker-compose logs backend | grep "017-import-jobs"

# Expected output:
# backend_1  | [Migration] Running migration: 017-import-jobs.sql
# backend_1  | [Migration] ✓ 017-import-jobs.sql completed

# 3. Open new terminal for API testing
export API_URL="http://localhost:3001/api"
export TOKEN="<your_keycloak_token>"  # From POST /auth/login

# 4. Create test campaign
CAMPAIGN_ID=$(curl -X POST $API_URL/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Import Test Campaign", "system": "D&D 5e"}' \
  | jq -r '.id')

echo "Campaign ID: $CAMPAIGN_ID"

# 5. Verify BYOLLM configured
curl "$API_URL/byollm/config" \
  -H "Authorization: Bearer $TOKEN" | jq '.provider'

# Expected: "openai" or "anthropic" (Feature 008 must be configured first)
```

---

## Scenario 1: Import Location Notes with Type Selection

**User Story**: As a GM, I want to upload location notes as a PDF, select "Location notes" import type, and see extracted locations in editable preview table.

**Acceptance Criteria**: Spec lines 49-65 (FR-001 to FR-004, FR-021 to FR-027)

### Step 1: Get available import types

```bash
curl "$API_URL/campaigns/$CAMPAIGN_ID/import/types" \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected output:
# {
#   "import_types": [
#     {
#       "type": "Location notes",
#       "table": "locations",
#       "description": "Import locations from campaign notes",
#       "sequential_supported": false
#     },
#     ...13 types total
#   ]
# }
```

**Validation**:
- ✅ 13 import types returned (FR-002)
- ✅ Each type has `type`, `table`, `description`, `sequential_supported` fields

### Step 2: Create test PDF with location notes

```bash
# Create test file (or use existing PDF)
cat > /tmp/locations.txt << 'EOF'
The city of Waterdeep is a bustling metropolis on the Sword Coast.
Population: 150,000. Known for its City Watch and powerful guilds.

Undermountain is a massive dungeon complex beneath Waterdeep.
Type: Mega-dungeon. Created by the mad wizard Halaster.

Candlekeep is a fortress library on the Sword Coast.
Population: 300 monks and scholars. Contains thousands of rare books.
EOF

# Note: In real scenario, upload actual PDF/DOCX file
```

### Step 3: Process import with AI extraction

```bash
# Upload file for processing
IMPORT_RESPONSE=$(curl -X POST "$API_URL/campaigns/$CAMPAIGN_ID/import/process" \
  -H "Authorization: Bearer $TOKEN" \
  -F "import_type=Location notes" \
  -F "file=@/tmp/locations.txt" \
  -F "custom_context=Focus on population and location types")

echo $IMPORT_RESPONSE | jq

# Expected output:
# {
#   "import_job_id": "550e8400-e29b-41d4-a716-446655440000",
#   "extracted_entities": [
#     {
#       "tempId": "temp-001",
#       "name": "Waterdeep",
#       "description": "A bustling metropolis on the Sword Coast...",
#       "location_type": "city",
#       "population": 150000,
#       "player_knowledge": "common_knowledge"
#     },
#     {
#       "tempId": "temp-002",
#       "name": "Undermountain",
#       "description": "A massive dungeon complex beneath Waterdeep...",
#       "location_type": "dungeon",
#       "parent_location_id": null,
#       "player_knowledge": "common_knowledge"
#     },
#     {
#       "tempId": "temp-003",
#       "name": "Candlekeep",
#       "description": "A fortress library on the Sword Coast...",
#       "location_type": "library",
#       "population": 300,
#       "player_knowledge": "common_knowledge"
#     }
#   ],
#   "duplicate_candidates": [],
#   "extracted_count": 3,
#   "processing_time_ms": 3200
# }

IMPORT_JOB_ID=$(echo $IMPORT_RESPONSE | jq -r '.import_job_id')
```

**Validation**:
- ✅ Processing completes in <5s (FR-018)
- ✅ 3 locations extracted with correct schema fields
- ✅ Preview displays all location database fields (FR-022)
- ✅ Each entity has temp ID for preview tracking
- ✅ No duplicates found (empty campaign)

### Step 4: Verify database NOT written yet

```bash
# Check locations table (should be empty)
curl "$API_URL/locations?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" | jq 'length'

# Expected: 0 (preview not confirmed yet)
```

**Validation**:
- ✅ Database unchanged until confirmation (stateless preview)

---

## Scenario 2: Edit Preview Fields Before Confirmation

**User Story**: As a GM, I want to edit extracted entity fields directly in preview table before confirming database writes.

**Acceptance Criteria**: Spec lines 66-76 (FR-028 to FR-033)

### Step 1: Prepare edited entities (simulating frontend edits)

```bash
# User edits in preview table:
# - Change Waterdeep population from 150000 → 200000
# - Change Undermountain player_knowledge to "dm_only"
# - Delete Candlekeep (not needed)

EDITED_ENTITIES='[
  {
    "tempId": "temp-001",
    "name": "Waterdeep",
    "description": "A bustling metropolis on the Sword Coast...",
    "location_type": "city",
    "population": 200000,
    "player_knowledge": "common_knowledge"
  },
  {
    "tempId": "temp-002",
    "name": "Undermountain",
    "description": "A massive dungeon complex beneath Waterdeep...",
    "location_type": "dungeon",
    "parent_location_id": null,
    "player_knowledge": "dm_only"
  }
]'
```

**Validation**:
- ✅ All fields editable in preview (FR-028)
- ✅ Row deleted from preview (FR-030)
- ✅ Row count updated: 3 → 2 (FR-031)

### Step 2: Confirm import with edited values

```bash
CONFIRM_RESPONSE=$(curl -X POST "$API_URL/campaigns/$CAMPAIGN_ID/import/confirm" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"import_job_id\": \"$IMPORT_JOB_ID\",
    \"import_type\": \"Location notes\",
    \"entities\": $EDITED_ENTITIES
  }")

echo $CONFIRM_RESPONSE | jq

# Expected output:
# {
#   "success": true,
#   "message": "2 locations imported, 0 updated",
#   "imported_count": 2,
#   "updated_count": 0,
#   "imported_ids": ["uuid-1", "uuid-2"],
#   "updated_ids": [],
#   "transaction_time_ms": 450
# }
```

**Validation**:
- ✅ Exactly 2 locations written (deleted row NOT imported) (FR-030)
- ✅ Edited values persisted (population 200000, player_knowledge dm_only)
- ✅ Transaction completes in <2s (FR-041)

### Step 3: Verify database writes

```bash
# Get locations from database
curl "$API_URL/locations?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-View-Mode: dm_view" | jq

# Expected: 2 locations (Waterdeep, Undermountain)

# Verify edited population
curl "$API_URL/locations?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | select(.name == "Waterdeep") | .population'

# Expected: 200000 (edited value, not 150000)

# Verify dm_only location hidden in player view
curl "$API_URL/locations?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-View-Mode: player_view" | jq 'length'

# Expected: 1 (only Waterdeep visible, Undermountain hidden)
```

**Validation**:
- ✅ 2 locations created in database
- ✅ Edited values correctly saved
- ✅ Information level filtering working (Feature 004 integration)
- ✅ Deleted preview row NOT in database

### Step 4: Verify import job deleted (ephemeral cleanup)

```bash
# Try to confirm same import job again (should fail)
curl -X POST "$API_URL/campaigns/$CAMPAIGN_ID/import/confirm" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"import_job_id\": \"$IMPORT_JOB_ID\",
    \"import_type\": \"Location notes\",
    \"entities\": $EDITED_ENTITIES
  }" | jq

# Expected: 404 error "Import job not found" (ephemeral job deleted after confirm)
```

**Validation**:
- ✅ Import job ephemeral (deleted after confirmation)

---

## Scenario 3: Resolve Duplicate Conflicts in Preview

**User Story**: As a GM, I want the system to flag potential duplicates so I can merge or delete them before confirming.

**Acceptance Criteria**: Spec lines 77-91 (FR-034 to FR-039)

### Step 1: Create NPC to test against

```bash
# Create existing NPC in database
EXISTING_NPC_ID=$(curl -X POST "$API_URL/npcs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "'$CAMPAIGN_ID'",
    "name": "Sir Gareth",
    "race": "Human",
    "class": ["Paladin"],
    "level": 10,
    "player_knowledge": "common_knowledge"
  }' | jq -r '.id')

echo "Existing NPC ID: $EXISTING_NPC_ID"
```

### Step 2: Import NPC notes with typo (duplicate name)

```bash
cat > /tmp/npcs.txt << 'EOF'
Ser Gareth is a paladin in the city guard. Level 10. Human.

Captain Marcus leads the city watch. Level 8. Fighter. Human.
EOF

IMPORT_RESPONSE=$(curl -X POST "$API_URL/campaigns/$CAMPAIGN_ID/import/process" \
  -H "Authorization: Bearer $TOKEN" \
  -F "import_type=NPC notes" \
  -F "file=@/tmp/npcs.txt")

echo $IMPORT_RESPONSE | jq

# Expected output:
# {
#   "import_job_id": "...",
#   "extracted_entities": [
#     {
#       "tempId": "temp-001",
#       "name": "Ser Gareth",
#       "race": "Human",
#       "class": ["Paladin"],
#       "level": 10
#     },
#     {
#       "tempId": "temp-002",
#       "name": "Captain Marcus",
#       "race": "Human",
#       "class": ["Fighter"],
#       "level": 8
#     }
#   ],
#   "duplicate_candidates": [
#     {
#       "id": "dup-001",
#       "import_job_id": "...",
#       "preview_entry_id": "temp-001",
#       "existing_entry_id": "<EXISTING_NPC_ID>",
#       "existing_entry_table": "npcs",
#       "existing_entry_name": "Sir Gareth",
#       "preview_entry_name": "Ser Gareth",
#       "similarity_score": 0.91,
#       "match_type": "name_match",
#       "resolution": "unresolved"
#     }
#   ],
#   "extracted_count": 2
# }

IMPORT_JOB_ID=$(echo $IMPORT_RESPONSE | jq -r '.import_job_id')
DUP_PREVIEW_ID=$(echo $IMPORT_RESPONSE | jq -r '.duplicate_candidates[0].preview_entry_id')
```

**Validation**:
- ✅ Duplicate detected: "Ser Gareth" vs "Sir Gareth" (FR-034)
- ✅ Similarity score 0.91 (Levenshtein distance, threshold 0.7) (FR-034)
- ✅ Duplicate flagged with warning badge (FR-035)
- ✅ Existing database entry shown for comparison (FR-036)

### Step 3: Resolve duplicate by merging

```bash
# User decides "Ser Gareth" is typo, merges into existing "Sir Gareth"
# - Copy any new details from preview to existing entity
# - Delete preview entry
# - Confirm import with only Captain Marcus

MERGED_ENTITIES='[
  {
    "tempId": "temp-002",
    "name": "Captain Marcus",
    "race": "Human",
    "class": ["Fighter"],
    "level": 8,
    "player_knowledge": "common_knowledge"
  }
]'

# Note: In real UI, merge would UPDATE existing entity via mergeWithExisting field
# For this test, we just delete duplicate preview entry

CONFIRM_RESPONSE=$(curl -X POST "$API_URL/campaigns/$CAMPAIGN_ID/import/confirm" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"import_job_id\": \"$IMPORT_JOB_ID\",
    \"import_type\": \"NPC notes\",
    \"entities\": $MERGED_ENTITIES
  }")

echo $CONFIRM_RESPONSE | jq

# Expected:
# {
#   "success": true,
#   "message": "1 NPC imported, 0 updated",
#   "imported_count": 1,
#   "updated_count": 0
# }
```

**Validation**:
- ✅ GM can delete duplicate preview row (FR-038)
- ✅ Only 1 new NPC written (Captain Marcus)
- ✅ Existing "Sir Gareth" NOT duplicated

### Step 4: Verify database state

```bash
# Get all NPCs
curl "$API_URL/npcs?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | .name'

# Expected output:
# "Sir Gareth"     (existing, NOT duplicated)
# "Captain Marcus" (imported)

# Total count: 2
curl "$API_URL/npcs?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" | jq 'length'

# Expected: 2
```

**Validation**:
- ✅ No duplicate "Ser Gareth" created
- ✅ Existing "Sir Gareth" unchanged
- ✅ Only unique NPC imported

---

## Scenario 4: Sequential Session Recap Import (Batch Mode)

**User Story**: As a GM, I want to import 3 session recap files in chronological order so the AI understands cause/effect timeline.

**Acceptance Criteria**: Spec lines 92-104 (FR-049 to FR-054)

### Step 1: Create 3 session recap files

```bash
cat > /tmp/session1.txt << 'EOF'
Session 1 - The Adventure Begins
Date: 2024-01-15
In-game date: Flamerule 1, 1492 DR

The party met in Waterdeep at the Yawning Portal tavern.
They accepted a quest from Durnan to explore Undermountain level 1.
Encountered 3 goblins and a gelatinous cube. Fighters McGee was paralyzed but survived.
Found 200 gold pieces and a +1 shortsword.
EOF

cat > /tmp/session2.txt << 'EOF'
Session 2 - Deeper into Undermountain
Date: 2024-01-22
In-game date: Flamerule 2, 1492 DR

The party descended to Undermountain level 2.
They discovered evidence that the goblins from Session 1 served a hobgoblin warlord.
Encountered the hobgoblin warlord Grimfang and his 5 guards.
Epic battle ensued. Captain Marcus was knocked unconscious but stabilized.
Defeated Grimfang and found a map to level 3.
EOF

cat > /tmp/session3.txt << 'EOF'
Session 3 - The Dark Altar
Date: 2024-01-29
In-game date: Flamerule 3, 1492 DR

Following the map from Session 2, the party found the dark altar on level 3.
The altar was dedicated to Orcus, explaining the undead presence.
Cleansed the altar using divine magic from Sir Gareth.
The hobgoblin survivors from Session 2 fled when the altar was destroyed.
Returned to Waterdeep with proof of victory. Durnan rewarded them with 1000 gold.
EOF
```

### Step 2: Process sequential import

```bash
# Note: In real implementation, this would be multipart/form-data with multiple files
# For test, we'll simulate the API response structure

SEQUENTIAL_RESPONSE=$(curl -X POST "$API_URL/campaigns/$CAMPAIGN_ID/import/process" \
  -H "Authorization: Bearer $TOKEN" \
  -F "import_type=Session Recap" \
  -F "sequential=true" \
  -F "files[]=@/tmp/session1.txt" \
  -F "files[]=@/tmp/session2.txt" \
  -F "files[]=@/tmp/session3.txt" \
  -F "custom_context=These sessions cover the Undermountain exploration arc")

echo $SEQUENTIAL_RESPONSE | jq

# Expected output (showing sequential processing):
# {
#   "import_job_id": "...",
#   "extracted_entities": [
#     {
#       "tempId": "temp-001",
#       "name": "Session 1 - The Adventure Begins",
#       "session_date": 1705276800,
#       "in_game_date_start": "Flamerule 1, 1492 DR",
#       "summary": "Party met in Waterdeep and explored Undermountain level 1...",
#       "key_events": [
#         "Met at Yawning Portal",
#         "Accepted quest from Durnan",
#         "Fought goblins and gelatinous cube",
#         "Found treasure"
#       ],
#       "npcs_encountered": ["<DURNAN_ID>"],
#       "locations_visited": ["<WATERDEEP_ID>", "<UNDERMOUNTAIN_ID>"],
#       "is_canon": 1,
#       "canonical_status": "canon"
#     },
#     {
#       "tempId": "temp-002",
#       "name": "Session 2 - Deeper into Undermountain",
#       "session_date": 1705881600,
#       "in_game_date_start": "Flamerule 2, 1492 DR",
#       "summary": "Party descended to level 2 and fought hobgoblin warlord...",
#       "key_events": [
#         "Discovered goblin connection to Grimfang",
#         "Fought Grimfang and guards",
#         "Captain Marcus knocked unconscious",
#         "Found map to level 3"
#       ],
#       "dm_consequences": "Goblin survivors may seek revenge",
#       "is_canon": 1,
#       "canonical_status": "canon"
#     },
#     {
#       "tempId": "temp-003",
#       "name": "Session 3 - The Dark Altar",
#       "session_date": 1706486400,
#       "in_game_date_start": "Flamerule 3, 1492 DR",
#       "summary": "Party found dark altar to Orcus and cleansed it...",
#       "key_events": [
#         "Found altar on level 3 (using map from Session 2)",
#         "Altar dedicated to Orcus",
#         "Cleansed altar with divine magic",
#         "Hobgoblin survivors fled",
#         "Returned to Waterdeep with victory"
#       ],
#       "is_canon": 1,
#       "canonical_status": "canon"
#     }
#   ],
#   "extracted_count": 3,
#   "duplicate_candidates": []
# }

IMPORT_JOB_ID=$(echo $SEQUENTIAL_RESPONSE | jq -r '.import_job_id')
```

**Validation**:
- ✅ Files processed in order: 1 → 2 → 3 (FR-052)
- ✅ AI references Session 1 events when extracting Session 2 (timeline context)
- ✅ AI references Session 2 map when extracting Session 3 (cause/effect)
- ✅ All 3 recaps extracted in single preview (FR-053)
- ✅ `is_canon` = 1 and `canonical_status` = "canon" for all recaps

### Step 3: Confirm batch import

```bash
CONFIRM_RESPONSE=$(curl -X POST "$API_URL/campaigns/$CAMPAIGN_ID/import/confirm" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"import_job_id\": \"$IMPORT_JOB_ID\",
    \"import_type\": \"Session Recap\",
    \"entities\": $(echo $SEQUENTIAL_RESPONSE | jq '.extracted_entities')
  }")

echo $CONFIRM_RESPONSE | jq

# Expected:
# {
#   "success": true,
#   "message": "3 session recaps imported, 0 updated",
#   "imported_count": 3
# }
```

**Validation**:
- ✅ All 3 recaps written to database in single transaction (FR-054)
- ✅ Chronological order preserved

### Step 4: Verify session recaps in database

```bash
curl "$API_URL/session-recaps?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | {name, session_date, key_events}'

# Expected: 3 session recaps with preserved timeline references
```

**Validation**:
- ✅ 3 session recaps created
- ✅ Cause/effect timeline coherent (Session 3 references Session 2 map)

---

## Scenario 5: Cancel Import Before Confirmation

**User Story**: As a GM, I want to cancel import if I uploaded the wrong file, discarding all proposed changes.

**Acceptance Criteria**: Spec lines 105-111 (FR-046 to FR-048)

### Step 1: Start new import

```bash
cat > /tmp/wrong_file.txt << 'EOF'
This is the wrong file content. Should not be imported.
Random NPC: Bob the Builder
Random Location: Construction Site
EOF

IMPORT_RESPONSE=$(curl -X POST "$API_URL/campaigns/$CAMPAIGN_ID/import/process" \
  -H "Authorization: Bearer $TOKEN" \
  -F "import_type=NPC notes" \
  -F "file=@/tmp/wrong_file.txt")

IMPORT_JOB_ID=$(echo $IMPORT_RESPONSE | jq -r '.import_job_id')

echo "Preview shows 1 NPC: Bob the Builder"
echo "User realizes this is wrong file"
```

### Step 2: Cancel import

```bash
CANCEL_RESPONSE=$(curl -X POST "$API_URL/campaigns/$CAMPAIGN_ID/import/cancel" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"import_job_id\": \"$IMPORT_JOB_ID\"}")

echo $CANCEL_RESPONSE | jq

# Expected:
# {
#   "success": true,
#   "message": "Import cancelled, no changes saved"
# }
```

**Validation**:
- ✅ Cancel button available at all stages (FR-046)
- ✅ All proposed changes discarded (FR-047)

### Step 3: Verify no database writes

```bash
# Check NPCs (should NOT include Bob the Builder)
curl "$API_URL/npcs?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | .name'

# Expected: Only "Sir Gareth" and "Captain Marcus" (from Scenario 3)
# NOT "Bob the Builder"

curl "$API_URL/npcs?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" | jq 'length'

# Expected: 2 (unchanged from Scenario 3)
```

**Validation**:
- ✅ No entities written to database
- ✅ Database unchanged after cancellation

### Step 4: Verify import job deleted

```bash
# Try to confirm cancelled import (should fail)
curl -X POST "$API_URL/campaigns/$CAMPAIGN_ID/import/confirm" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"import_job_id\": \"$IMPORT_JOB_ID\",
    \"import_type\": \"NPC notes\",
    \"entities\": []
  }" | jq

# Expected: 404 error "Import job not found"
```

**Validation**:
- ✅ Import job deleted after cancellation (FR-048)

---

## Scenario 6: Use Text Paste Instead of File Upload

**User Story**: As a GM, I want to paste raw text instead of uploading a file for quick imports.

**Acceptance Criteria**: Spec lines 113-124 (FR-006)

### Step 1: Import quest via text paste

```bash
QUEST_TEXT="The party needs to recover the Sunstone from the goblin caves. Reward: 500 gold. This is a side quest, not main story."

IMPORT_RESPONSE=$(curl -X POST "$API_URL/campaigns/$CAMPAIGN_ID/import/process" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"import_type\": \"Quest notes\",
    \"text\": \"$QUEST_TEXT\",
    \"custom_context\": \"This is a side quest, not main story\"
  }")

echo $IMPORT_RESPONSE | jq

# Expected:
# {
#   "import_job_id": "...",
#   "extracted_entities": [
#     {
#       "tempId": "temp-001",
#       "name": "Recover the Sunstone",
#       "description": "The party needs to recover the Sunstone from the goblin caves.",
#       "status": "not_started",
#       "rewards": "500 gold",
#       "player_knowledge": "common_knowledge",
#       "tags": ["side-quest"]
#     }
#   ],
#   "extracted_count": 1
# }

IMPORT_JOB_ID=$(echo $IMPORT_RESPONSE | jq -r '.import_job_id')
```

**Validation**:
- ✅ Text paste accepted (FR-006)
- ✅ AI processes pasted text same as file upload
- ✅ Custom context applied ("side quest" tag)

### Step 2: Confirm quest import

```bash
CONFIRM_RESPONSE=$(curl -X POST "$API_URL/campaigns/$CAMPAIGN_ID/import/confirm" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"import_job_id\": \"$IMPORT_JOB_ID\",
    \"import_type\": \"Quest notes\",
    \"entities\": $(echo $IMPORT_RESPONSE | jq '.extracted_entities')
  }")

echo $CONFIRM_RESPONSE | jq

# Expected:
# {
#   "success": true,
#   "message": "1 quest imported, 0 updated",
#   "imported_count": 1
# }
```

### Step 3: Verify quest in database

```bash
curl "$API_URL/quests?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected: 1 quest "Recover the Sunstone" with status "not_started"
```

**Validation**:
- ✅ Quest created from text paste
- ✅ Text paste workflow identical to file upload

---

## Performance Validation

```bash
# Test AI processing speed (FR-018: <5s for 10-page document)
cat > /tmp/large_npcs.txt << 'EOF'
# (Paste 10 pages of NPC descriptions here - ~5000 words)
NPC 1: Name, description, stats...
NPC 2: Name, description, stats...
...
NPC 50: Name, description, stats...
EOF

START_TIME=$(date +%s)
IMPORT_RESPONSE=$(curl -X POST "$API_URL/campaigns/$CAMPAIGN_ID/import/process" \
  -H "Authorization: Bearer $TOKEN" \
  -F "import_type=NPC notes" \
  -F "file=@/tmp/large_npcs.txt")
END_TIME=$(date +%s)

ELAPSED=$((END_TIME - START_TIME))
echo "Processing time: ${ELAPSED}s"
echo "Expected: <5s for 10-page document"

# Check processing_time_ms in response
echo $IMPORT_RESPONSE | jq '.processing_time_ms'
```

**Performance Targets**:
- ✅ AI processing: <5s for 10-page document (FR-018)
- ✅ Preview rendering: <500ms for 50 entities (FR-025)
- ✅ Database write: <2s for 50 entities (atomic transaction)

---

## SQL Verification Queries

```bash
# Connect to SQLite database directly
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db

# Query import_jobs table (should be empty - ephemeral cleanup)
SELECT COUNT(*) FROM import_jobs;
-- Expected: 0 (all jobs deleted after confirm/cancel)

# Query duplicate_candidates table (should be empty - CASCADE delete)
SELECT COUNT(*) FROM duplicate_candidates;
-- Expected: 0 (deleted when import_jobs deleted)

# Query locations table (from Scenario 1+2)
SELECT name, population, player_knowledge FROM locations WHERE campaign_id = '<CAMPAIGN_ID>';
-- Expected: 2 rows (Waterdeep 200000, Undermountain dm_only)

# Query npcs table (from Scenario 3)
SELECT name, race, class, level FROM npcs WHERE campaign_id = '<CAMPAIGN_ID>';
-- Expected: 2 rows (Sir Gareth Paladin 10, Captain Marcus Fighter 8)

# Query session_recaps table (from Scenario 4)
SELECT name, is_canon, canonical_status FROM session_recaps WHERE campaign_id = '<CAMPAIGN_ID>' ORDER BY session_date;
-- Expected: 3 rows (Session 1, Session 2, Session 3 - all canon)

# Query quests table (from Scenario 6)
SELECT name, status, rewards FROM quests WHERE campaign_id = '<CAMPAIGN_ID>';
-- Expected: 1 row (Recover the Sunstone, not_started, 500 gold)

# Exit SQLite
.quit
```

---

## Cleanup

```bash
# Delete test campaign (CASCADE deletes all category entities)
curl -X DELETE "$API_URL/campaigns/$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN"

# Verify all locations deleted
curl "$API_URL/locations?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" | jq 'length'

# Expected: 0 (CASCADE delete removed all entities)

# Verify all NPCs deleted
curl "$API_URL/npcs?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" | jq 'length'

# Expected: 0

# Verify all session recaps deleted
curl "$API_URL/session-recaps?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" | jq 'length'

# Expected: 0

# Verify all quests deleted
curl "$API_URL/quests?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" | jq 'length'

# Expected: 0
```

---

## Success Criteria

✅ **All 6 test scenarios pass**:
1. ✅ Import location notes with type selection (FR-001 to FR-004, FR-021 to FR-027)
2. ✅ Edit preview fields before confirmation (FR-028 to FR-033)
3. ✅ Resolve duplicate conflicts in preview (FR-034 to FR-039)
4. ✅ Sequential session recap import (FR-049 to FR-054)
5. ✅ Cancel import before confirmation (FR-046 to FR-048)
6. ✅ Use text paste instead of file upload (FR-006)

✅ **Type selection workflow** (13 import types available)
✅ **Preview editing UX** (inline table edits, delete rows, validation)
✅ **Duplicate detection** (Levenshtein distance, 0.7 threshold, merge/delete)
✅ **Sequential batch import** (Session Recap chronological processing)
✅ **Cancellation** (discard changes, reset dialog)
✅ **Text paste** (alternative to file upload)
✅ **Atomic transactions** (all-or-nothing database writes)
✅ **Ephemeral cleanup** (import jobs deleted after confirm/cancel)
✅ **Performance targets** (<5s processing, <500ms preview, <2s DB write)
✅ **Information level integration** (player_knowledge filtering, dm_only fields)

---

## Troubleshooting

**Issue**: Processing returns "BYOLLM not configured" error
**Solution**: Configure BYOLLM settings (Feature 008): `curl $API_URL/settings/byollm` - set OpenAI or Anthropic credentials

**Issue**: File upload fails with "Unsupported file format"
**Solution**: Upload PDF, DOCX, TXT, or MD files only. Check file MIME type matches declared extension.

**Issue**: No extractable text in PDF
**Solution**: PDF may be scanned images only. Use OCR tool or export to text format.

**Issue**: Duplicate detection too sensitive (false positives)
**Solution**: Threshold hardcoded to 0.7 (same as Feature 005). Adjust in `backend/src/utils/fuzzyMatch.ts` if needed.

**Issue**: Preview shows validation errors for required fields
**Solution**: Edit fields inline before confirming. Name and description are required for all categories.

**Issue**: Database write fails with foreign key constraint
**Solution**: Verify referenced entities exist (e.g., faction_id must exist in factions table). Delete invalid FK references in preview.

**Issue**: Import job not found after processing
**Solution**: Import jobs are ephemeral (10min TTL). Process → Preview → Confirm must complete within 10 minutes.

**Issue**: Sequential import processes files out of order
**Solution**: Verify files array order in request. Frontend must send files in chronological order.

---

## Next Steps

- **Feature 018**: External campaign sharing (public URLs, password protection)
- **Feature 019**: Wiki-style card linking and cross-references
- **Feature 020**: Knowledge graph auto-population from imports (different from Feature 017 database-only approach)

---

**Status**: ✅ Quickstart complete - 6 scenarios, performance validation, SQL verification queries
