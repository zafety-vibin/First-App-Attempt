# Quickstart Guide: Authentication & Campaign Management

**Feature**: 002-create-the-authentication
**Phase**: 1 (Design & Contracts)
**Date**: 2025-10-01
**Prerequisites**: Docker Desktop installed and running

---

## Overview

This guide walks you through setting up and testing the VVD-mimic authentication system running entirely on localhost. You'll start all services with one command, create a test account, and verify the campaign management workflow.

**What you'll test**:
- ✓ Keycloak authentication (login/logout)
- ✓ Campaign creation and management
- ✓ Session persistence across page refreshes
- ✓ Public campaign URL generation

**Time estimate**: 10 minutes

---

## Prerequisites

1. **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
   - Verify: `docker --version` (should be ≥20.10)
   - Verify: `docker-compose --version` (should be ≥2.0)

2. **Git** (to clone repository)
   - Verify: `git --version`

3. **Browser**: Chrome, Firefox, or Edge (latest version)

4. **Ports available**: 8080 (Keycloak), 3001 (Backend), 3000 (Frontend)
   - Check: `netstat -an | findstr "8080 3001 3000"` (Windows)
   - Check: `lsof -i :8080,3001,3000` (Mac/Linux)

---

## Quick Start (3 steps)

### Step 1: Start All Services

```bash
# Clone repository (if not already cloned)
git clone https://github.com/zafety-vibin/First-App-Attempt.git
cd First-App-Attempt

# Start all services with Docker Compose
docker-compose up --build

# Wait for health checks to pass (30-60 seconds)
# You should see:
# ✓ vvd-keycloak   | Keycloak started
# ✓ vvd-backend    | Backend listening on http://localhost:3001
# ✓ vvd-frontend   | Vite dev server running at http://localhost:3000
```

**Expected output**:
```
vvd-keycloak   | Keycloak 24.x.x started in 15.2s
vvd-backend    | Server started on http://localhost:3001
vvd-backend    | Database initialized: 3 tables created
vvd-frontend   | ➜  Local:   http://localhost:3000/
```

### Step 2: Create Test Account

1. **Open browser**: Navigate to http://localhost:3000
2. **Click "Login"** (top-left button on landing page)
3. **Redirected to Keycloak** (http://localhost:8080/realms/vvd-mimic)
4. **Click "Register"** (below login form)
5. **Fill registration form**:
   - Username: `testuser`
   - Email: `test@localhost.com`
   - Password: `password123`
   - Confirm password: `password123`
6. **Click "Register"**
7. **Redirected back to** http://localhost:3000/campaigns

**Expected result**: You're now logged in and see the Campaign Management page (empty state: "No campaigns yet")

### Step 3: Create First Campaign

1. **Click "New Campaign"** button
2. **Enter campaign name**: "Waterdeep Dragon Heist"
3. **Click "Create"**
4. **Campaign appears in list** with creation timestamp
5. **Click campaign card** → navigates to campaign homepage (http://localhost:3000/campaigns/{id})
6. **See GM View**: Campaign homepage displays (will be empty until spec 003 implemented)

**Expected result**: Campaign created successfully, visible in campaigns list

---

## Primary User Flow Test

This test validates the complete user journey from the spec:

### Test: GM Authentication → Campaign Creation → Public Sharing

**Steps**:

1. **Visit landing page** (http://localhost:3000)
   - Verify: Public landing page visible with app information
   - Verify: Login button in top-left corner

2. **Click "Login"**
   - Verify: Redirected to Keycloak (http://localhost:8080)
   - Verify: Login form appears

3. **Login with test account**
   - Username: `testuser`
   - Password: `password123`
   - Verify: Redirected to http://localhost:3000/campaigns

4. **Verify post-login state**
   - Verify: User info displayed (username in navbar)
   - Verify: Logout button visible
   - Verify: Campaign list empty or shows existing campaigns

5. **Create campaign**
   - Click "New Campaign"
   - Name: "Test Campaign"
   - Click "Create"
   - Verify: Campaign appears in list immediately

6. **Open campaign**
   - Click campaign card
   - Verify: Navigate to /campaigns/{id}
   - Verify: Campaign homepage visible (GM View)

7. **Enable public sharing**
   - Navigate to Campaign Settings (gear icon)
   - Toggle "Public Access" ON
   - Verify: Random URL generated (format: http://localhost:3000/c/a8f3D92k4p1mN7qR)
   - Verify: "Copy URL" button appears

8. **Test public URL** (incognito/private window)
   - Open public URL in incognito browser
   - Verify: Campaign homepage visible WITHOUT login
   - Verify: Read-only mode (no edit buttons)

9. **Add password protection**
   - Back to GM view
   - Campaign Settings → Public Sharing
   - Set password: "dragonborn"
   - Save
   - Open public URL in new incognito window
   - Verify: Password prompt appears
   - Enter password: "dragonborn"
   - Verify: Campaign content visible

10. **Disable public access**
    - Toggle "Public Access" OFF
    - Open public URL in incognito window
    - Verify: "Campaign not publicly available" message

11. **Test logout**
    - Click Logout button
    - Verify: Redirected to landing page (http://localhost:3000)
    - Verify: Keycloak session cleared
    - Try to access /campaigns directly
    - Verify: Redirected back to / (not authenticated)

12. **Test session persistence**
    - Login again
    - Navigate to /campaigns
    - Refresh page (F5)
    - Verify: Still authenticated, campaigns still visible
    - Verify: No re-login required

**Expected result**: All verifications pass ✓

---

## API Testing with cURL

Test backend endpoints directly:

### 1. Health Check (Public)

```bash
curl http://localhost:3001/health

# Expected:
# {"status":"healthy","timestamp":"2025-10-01T12:00:00Z"}
```

### 2. Get Access Token

```bash
# Login via Keycloak (copy token from browser DevTools or use this flow)
# In browser: Open DevTools → Network → Click Login → Find token in response

# For testing, use Keycloak Direct Access Grant:
curl -X POST http://localhost:8080/realms/vvd-mimic/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser" \
  -d "password=password123" \
  -d "grant_type=password" \
  -d "client_id=vvd-mimic-frontend"

# Response includes:
# {"access_token":"eyJhbGc...","refresh_token":"eyJhbGc...","expires_in":300}

# Copy access_token for next requests
export TOKEN="eyJhbGc..."
```

### 3. List Campaigns

```bash
curl http://localhost:3001/api/campaigns \
  -H "Authorization: Bearer $TOKEN"

# Expected:
# {"campaigns":[],"total":0}  # if no campaigns
# or
# {"campaigns":[{...}],"total":1}
```

### 4. Create Campaign

```bash
curl -X POST http://localhost:3001/api/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Campaign via API"}'

# Expected:
# {"id":"d4e5f6a7-...","name":"Test Campaign via API","ownerId":"a3b8c9d4-...","publicAccessEnabled":false,...}
```

### 5. Update Campaign (Enable Public Access)

```bash
curl -X PUT http://localhost:3001/api/campaigns/{CAMPAIGN_ID} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"publicAccessEnabled":true}'

# Expected:
# {...,"publicUrlId":"a8f3D92k4p1mN7qR","publicAccessEnabled":true,...}
```

### 6. Access Public Campaign (No Auth)

```bash
curl http://localhost:3001/c/a8f3D92k4p1mN7qR

# Expected:
# {"campaign":{...},"content":{...}}
```

### 7. Delete Campaign

```bash
curl -X DELETE http://localhost:3001/api/campaigns/{CAMPAIGN_ID} \
  -H "Authorization: Bearer $TOKEN"

# Expected: 204 No Content (empty response)
```

---

## Verification Checklist

After completing the quickstart, verify these requirements from spec.md:

### User Scenarios
- [ ] **US-1**: GM visits VVD-mimic, sees public landing with login button
- [ ] **US-2**: GM clicks login, redirected to Keycloak, logs in successfully
- [ ] **US-3**: After login, GM sees campaign management page
- [ ] **US-4**: GM creates new campaign with name "Test Campaign"
- [ ] **US-5**: GM opens campaign, sees campaign homepage (GM View)
- [ ] **US-6**: GM enables public sharing, receives random URL
- [ ] **US-7**: Player (incognito browser) accesses public URL without login
- [ ] **US-8**: Public view shows content in Player/General View (read-only)
- [ ] **US-9**: GM disables public access, public URL shows "not available"
- [ ] **US-10**: GM logs out, session cleared, redirected to landing page

### Functional Requirements
- [ ] **FR-001**: Keycloak authentication working on localhost:8080
- [ ] **FR-002**: User can create account via Keycloak registration
- [ ] **FR-003**: User can log in and session persists across refreshes
- [ ] **FR-004**: User can log out and session is destroyed
- [ ] **FR-005**: Campaign creation generates UUID and stores in SQLite
- [ ] **FR-006**: Campaign list shows only user's own campaigns
- [ ] **FR-007**: Campaign CRUD operations require authentication (401 if not logged in)
- [ ] **FR-008**: Public URL generation uses crypto.randomBytes (16 chars, base64url)
- [ ] **FR-009**: Public URL remains constant when toggling public access
- [ ] **FR-010**: Public URL accessible without authentication
- [ ] **FR-011**: Campaign deletion cascade deletes all content

---

## Troubleshooting

### Services won't start

**Problem**: `docker-compose up` fails with port conflicts

```bash
# Solution: Check what's using ports
netstat -an | findstr "8080 3001 3000"  # Windows
lsof -i :8080,3001,3000                 # Mac/Linux

# Stop conflicting services or change ports in docker-compose.yml
```

**Problem**: Keycloak health check fails after 5 minutes

```bash
# Solution: Increase start_period in docker-compose.yml
# services:
#   keycloak:
#     healthcheck:
#       start_period: 60s  # Increase from 30s
```

### Login fails

**Problem**: Redirected to Keycloak but get "Invalid redirect URI"

```bash
# Solution: Check realm configuration
# 1. Open http://localhost:8080/admin (admin/admin)
# 2. Select vvd-mimic realm
# 3. Clients → vvd-mimic-frontend → Settings
# 4. Valid Redirect URIs: http://localhost:3000/*
# 5. Web Origins: http://localhost:3000
# 6. Save
```

**Problem**: "CORS error" in browser console

```bash
# Solution: Verify backend CORS configuration
# backend/src/middleware/cors.ts should have:
# origin: 'http://localhost:3000'
# credentials: true
```

### Campaigns not loading

**Problem**: GET /api/campaigns returns 401 Unauthorized

```bash
# Solution: Check token in Authorization header
# 1. Open DevTools → Network tab
# 2. Find /api/campaigns request
# 3. Verify Authorization: Bearer <token> header present
# 4. If missing, check keycloakService.ts axios interceptor
```

**Problem**: Database errors in backend logs

```bash
# Solution: Reset SQLite database
docker-compose down -v  # Remove volumes
rm -rf ./data           # Delete data directory
docker-compose up       # Recreate database
```

### Public URL not working

**Problem**: Public URL returns 404

```bash
# Solution: Verify campaign has publicAccessEnabled = true
curl http://localhost:3001/api/campaigns/{id} \
  -H "Authorization: Bearer $TOKEN"

# Check response:
# "publicAccessEnabled": true   ✓ correct
# "publicAccessEnabled": false  ✗ need to enable
```

---

## Clean Slate Reset

To start completely fresh:

```bash
# Stop all services
docker-compose down -v

# Remove all data (campaigns, users, sessions)
rm -rf ./data

# Remove Keycloak data (users, realm)
docker volume rm vvd-mimic_keycloak-data

# Rebuild and restart
docker-compose up --build

# Re-register test user
# Visit http://localhost:3000 → Login → Register
```

---

## Next Steps

After verifying authentication works:

1. **Spec 003**: Implement card-based architecture (campaign content)
2. **Spec 004**: Implement information filtering (System, Common, Player, DM Secret)
3. **Spec 010**: Implement draft/publish workflow for public campaigns

---

## Success Criteria

You've successfully completed the quickstart when:

✅ All three services running without errors
✅ Test user registered and can log in
✅ Campaign created and visible in list
✅ Public URL generated and accessible
✅ Session persists across page refreshes
✅ Logout clears session and redirects to landing page
✅ All API endpoints respond correctly (health, campaigns, sessions)
✅ No CORS errors in browser console
✅ SQLite database persists data across Docker restarts

---

**Estimated completion time**: 10-15 minutes for first-time setup

**Questions or issues?** Check logs:
```bash
docker-compose logs keycloak  # Keycloak errors
docker-compose logs backend   # API errors
docker-compose logs frontend  # React errors
```
