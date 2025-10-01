# Quickstart: Public Campaign View & Sharing

**Feature**: 010-create-public-campaign
**Date**: 2025-10-01
**Prerequisites**: Features 002-004 fully implemented

## Overview

This quickstart validates the complete Public Campaign View & Sharing workflow from the primary user story (spec.md lines 21-22). Tests the GM flow (enable → customize → publish) and player flow (access → authenticate → view filtered content).

**Test Campaign**: Waterdeep campaign with 10 sessions of content, appropriately tagged (Common Knowledge, Player Knowledge, DM Secret)

---

## Step 1: Enable Public Sharing

**Actor**: GM
**Goal**: Enable public sharing and generate random ID URL

1. Navigate to Campaign Settings for Waterdeep campaign
2. Locate "Public Sharing" section
3. Verify toggle shows "Public Access: OFF"
4. Click toggle to enable public access
5. **Expected Result**:
   - Random ID URL generated (format: `vvd-mimic.app/c/[12+ char random ID]`)
   - URL displayed with copy button
   - System redirects to public homepage editor

**Validation**:
- `public_sharing_configs` table has 1 row for campaign
- `public_access_enabled` = 1
- `random_id` is 12+ alphanumeric characters
- `published_version_id` = NULL (not yet published)

---

## Step 2: Customize Public Homepage

**Actor**: GM
**Goal**: Customize public homepage using card architecture

1. Observe template with 3 example cards:
   - Welcome card (banner image placeholder, welcome text)
   - Navigation card (links to Locations, Characters, Session Recaps)
   - Featured Content card (placeholder)
2. Edit welcome card:
   - Upload banner image (Waterdeep cityscape)
   - Change text to "Welcome to Waterdeep, City of Splendors"
3. Edit navigation card:
   - Update links to point to actual campaign databases
   - Add link to "Tavern Map" (a map card)
4. Edit featured content card:
   - Add highlight: "Session 10 Recap - The Zhentarim Plot"
5. Save all changes

**Validation**:
- `cards` table has 3 cards with `card_type='public_homepage'`
- Cards contain GM's customizations (TipTap JSON content)
- Changes are in draft (not yet visible on public URL)

---

## Step 3: Make Draft Edits to Campaign

**Actor**: GM
**Goal**: Verify draft changes don't appear on public URL yet

1. Navigate to Locations database
2. Add new city: "Daggerford" (tagged as Common Knowledge)
3. Edit existing city map (Waterdeep Map):
   - Add pin: "Zhentarim Hideout" (tagged as DM Secret)
4. Create new session recap card: "Session 11 Recap" (tagged as Player Knowledge)
5. Do NOT publish yet

**Validation**:
- `cards` table updated with new content
- `published_versions` table is still empty
- Public URL (if accessed) returns 404 "No published version"

---

## Step 4: Publish Changes

**Actor**: GM
**Goal**: Publish draft state to public view

1. Click "Publish Changes" button (visible in Campaign Settings or campaign interface)
2. Observe loading indicator
3. **Expected Result**:
   - Success message: "Campaign published successfully"
   - Last published timestamp displayed
   - Draft status indicator changes to "Published"

**Validation**:
- `published_versions` table has 1 row:
  - `content_snapshot` contains JSONB with all cards and graphs
  - `published_at` timestamp is current
- `public_sharing_configs.published_version_id` references new version
- `public_sharing_configs.last_published_at` matches timestamp

**Performance Check**:
- Publish operation completes in < 1 second for ~500 cards

---

## Step 5: Set Optional Password

**Actor**: GM
**Goal**: Add password protection to public campaign

1. Navigate back to Campaign Settings → Public Sharing
2. Enter password: "dragonborn"
3. Save changes

**Validation**:
- `public_sharing_configs.password` = "dragonborn" (plaintext)
- No session invalidation (GM is authenticated via Keycloak, not password)

---

## Step 6: Access Public URL (Player - No Password Yet)

**Actor**: Player
**Goal**: Access public campaign URL

1. Open browser (incognito/private mode to simulate new player)
2. Navigate to `vvd-mimic.app/c/{random_id}` (copy URL from GM's Campaign Settings)
3. **Expected Result**:
   - Password prompt displayed
   - Message: "This campaign is password protected"
   - Input field for password
   - "Access Campaign" button

**Validation**:
- GET `/api/c/{random_id}` returns 401 with `password_protected: true`
- Page includes `<meta name="robots" content="noindex, nofollow">`
- Response header: `X-Robots-Tag: noindex, nofollow`

---

## Step 7: Authenticate with Password

**Actor**: Player
**Goal**: Enter correct password and gain access

1. Enter password: "dragonborn"
2. Click "Access Campaign"
3. **Expected Result**:
   - Authentication successful
   - Redirected to public campaign homepage
   - Session created (30-minute expiration)

**Validation**:
- POST `/api/c/{random_id}` with `{password: "dragonborn"}` returns 200
- Session cookie set with `maxAge: 1800000` (30 minutes)
- Player can now access campaign content

---

## Step 8: View Public Campaign Homepage

**Actor**: Player
**Goal**: View customized public homepage

1. Observe public homepage rendering
2. **Expected Result**:
   - Welcome card displays: Banner image + "Welcome to Waterdeep, City of Splendors"
   - Navigation card displays: Links to Locations, Characters, Session Recaps, Tavern Map
   - Featured Content card displays: "Session 10 Recap - The Zhentarim Plot"
   - Interface is read-only (no edit buttons, no comment fields)

**Validation**:
- GET `/api/c/{random_id}` returns `PublicCampaignContent` with filtered cards
- Response includes public homepage cards (card_type='public_homepage')
- No DM Secret content visible

---

## Step 9: Navigate and Verify Information Filtering

**Actor**: Player
**Goal**: Verify Player/General View filtering applied

### Test Case 9A: Browse Locations Database
1. Click "Locations" link from navigation
2. **Expected Results**:
   - "Daggerford" visible (Common Knowledge)
   - Other Common Knowledge cities visible
   - DM Secret cities **NOT** visible (filtered out)

**Validation**:
- Database entries with `information_level='DM Secret'` excluded from response
- Partial visibility: If database has "Player Knowledge" field, only show visible rows

### Test Case 9B: View Waterdeep Map
1. Click "Tavern Map" link
2. **Expected Results**:
   - Map renders with pins
   - "Zhentarim Hideout" pin **NOT** visible (tagged as DM Secret)
   - Other Player Knowledge/Common Knowledge pins visible

**Validation**:
- Map pins referencing DM Secret cards excluded from response

### Test Case 9C: View Knowledge Graphs
1. Navigate to knowledge graph view (if accessible from public homepage)
2. **Expected Results**:
   - Political-Web graph displayed
   - Nodes/edges tagged as DM Secret **NOT** visible
   - Filtered graph maintains structural integrity (no broken edges)

**Validation**:
- Knowledge graphs filtered via `ViewModeService.filterGraph(graph, 'player')`
- DM Secret nodes and their edges excluded

### Test Case 9D: Empty Section Handling
1. Navigate to a database that becomes 100% empty after filtering (all DM Secret entries)
2. **Expected Result**:
   - Section hidden entirely from navigation
   - No "empty state" message shown
3. Navigate to a database with partial visibility (some DM Secret, some visible)
4. **Expected Result**:
   - Section visible in navigation
   - Only visible entries shown
   - No indication that entries are hidden

**Validation**:
- 100% empty sections: Not included in response
- Partial sections: Included with filtered entries only

---

## Step 10: Verify Read-Only Access

**Actor**: Player
**Goal**: Confirm no editing/interaction capabilities

1. Attempt to find edit button on any card → **Not present**
2. Attempt to find comment section → **Not present**
3. Attempt to find bookmark/favorite button → **Not present**
4. Right-click on card content → **No context menu for editing**

**Validation**:
- No PUT/PATCH/DELETE endpoints accessible from public view
- Frontend components are read-only variants (PublicCampaignView, not CardEditor)

---

## Step 11: Test Password Change Grace Period

**Actor**: GM + Player
**Goal**: Verify 30-minute grace period on password change

### Setup
- Player is currently authenticated (session from Step 7, < 30 minutes old)
- Player's session timestamp: `session.authorizedAt = Date.now()`

### Test Case 11A: Change Password (Player Session < 30 Minutes Old)
1. GM: Navigate to Campaign Settings → Public Sharing
2. GM: Change password from "dragonborn" to "newpassword"
3. GM: Save changes
4. Player: Refresh page or navigate to different card
5. **Expected Result**:
   - Player's session **REMAINS VALID** (grace period)
   - Player can continue browsing

**Validation**:
- Middleware checks: `(Date.now() - session.authorizedAt) < 1800000` → allow access
- `public_sharing_configs.password` = "newpassword"

### Test Case 11B: New Visitor After Password Change
1. New Player (different browser): Navigate to `vvd-mimic.app/c/{random_id}`
2. New Player: Enter old password "dragonborn"
3. **Expected Result**:
   - Authentication **FAILS**
   - Error: "Invalid password"
4. New Player: Enter new password "newpassword"
5. **Expected Result**:
   - Authentication **SUCCEEDS**

**Validation**:
- New sessions must use current password
- Old password immediately invalid for new auth attempts

### Test Case 11C: Player Session > 30 Minutes Old
1. Simulate: Set `session.authorizedAt` to 31 minutes ago
2. Player: Attempt to access page
3. **Expected Result**:
   - Session **INVALIDATED**
   - Redirected to password prompt
   - Must enter new password "newpassword"

**Validation**:
- Middleware checks: `(Date.now() - session.authorizedAt) >= 1800000` → require re-auth

---

## Step 12: Disable Public Access

**Actor**: GM
**Goal**: Make campaign private again

1. Navigate to Campaign Settings → Public Sharing
2. Toggle "Public Access: ON" → "OFF"
3. Save changes
4. **Expected Result**:
   - Toggle shows "Public Access: OFF"
   - Random ID URL still displayed (persists, not regenerated)
   - Message: "Public access disabled. Your URL will remain the same if you re-enable."

**Validation**:
- `public_sharing_configs.public_access_enabled` = 0
- `public_sharing_configs.random_id` **unchanged** (persists)
- `public_sharing_configs.published_version_id` **unchanged** (persists)

---

## Step 13: Verify Public URL Shows "Not Available"

**Actor**: Player
**Goal**: Confirm public URL returns appropriate message when disabled

1. Player: Navigate to `vvd-mimic.app/c/{random_id}`
2. **Expected Result**:
   - Page displays: "Campaign not publicly available"
   - Clear, user-friendly message
   - No error stack trace or technical details

**Validation**:
- GET `/api/c/{random_id}` returns 404
- Response: `{error: "Campaign not publicly available"}`

---

## Step 14: Re-Enable and Verify Same URL

**Actor**: GM
**Goal**: Confirm random ID persists across disable/enable cycles

1. Navigate to Campaign Settings → Public Sharing
2. Toggle "Public Access: OFF" → "ON"
3. **Expected Result**:
   - Same random ID URL displayed (no regeneration)
   - Last published version still available
   - No need to re-publish (content already published)

**Validation**:
- `public_sharing_configs.random_id` **unchanged**
- `public_sharing_configs.public_access_enabled` = 1
- Public URL immediately accessible with previous published content

---

## Step 15: Performance Validation

**Goal**: Validate performance goals from Technical Context

### Test Case 15A: Public URL Access Time
1. Player: Access public URL (cold start, no cache)
2. Measure time from request to first content render
3. **Expected Result**: < 200ms p95

**Validation**:
- Use browser DevTools Network tab
- Measure `GET /api/c/{random_id}` response time
- Acceptable: 150-200ms for 500-card campaign

### Test Case 15B: Publish Operation Time
1. GM: Create 100 new cards (simulate large update)
2. GM: Click "Publish Changes"
3. Measure time from button click to success message
4. **Expected Result**: < 1 second for typical campaign (500 cards)

**Validation**:
- Use backend timing logs
- Measure SQLite transaction duration
- Acceptable: 800ms - 1s for 500-card snapshot

---

## Success Criteria

**Quickstart passes if**:
✓ All 15 steps complete without errors
✓ Information filtering correctly hides DM Secret content
✓ Draft/publish workflow maintains consistency (no content leaks)
✓ Password protection works with 30-minute grace period
✓ Random ID persists across disable/enable cycles
✓ Performance goals met (< 200ms public access, < 1s publish)
✓ Read-only enforcement (no editing/commenting in public view)
✓ SEO prevention (noindex meta tags and headers present)

**Failure Indicators**:
✗ DM Secret content visible in public view
✗ Draft changes appear on public URL before publish
✗ Password bypass or authentication failure
✗ Random ID regenerates on re-enable
✗ Performance goals exceeded (> 200ms access, > 1s publish)

---

## Rollback Procedure

If quickstart fails and needs rollback:

1. Disable public access for test campaign
2. Delete test `public_sharing_configs` row
3. Delete test `published_versions` rows
4. Drop tables if necessary:
   ```sql
   DROP TABLE IF EXISTS public_sharing_configs;
   DROP TABLE IF EXISTS published_versions;
   ```
5. Restart Docker containers to reset state

---

## Next Steps

After quickstart validation:
1. Review performance metrics
2. Note any edge cases discovered during testing
3. Proceed to `/tasks` command to generate implementation task list
4. Begin TDD implementation (contract tests → models → services → UI)
