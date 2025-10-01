# Quickstart: BYOLLM Configuration Validation

**Feature**: 008-create-byollm-configuration
**Date**: 2025-10-01
**Purpose**: Step-by-step validation of primary user story (connect LLM account for Import/Planning AI)

## Prerequisites

- Docker Compose running (keycloak, backend, frontend)
- User logged in with valid credentials
- Campaign created
- Import AI feature (Feature 005) available in UI

---

## Validation Workflow

### Step 1: Attempt Import AI without BYOLLM configuration

**Action**:
1. Navigate to campaign page
2. Click "Import" tab or button
3. Observe UI

**Expected Result**:
- Import AI feature displays blocking error overlay
- Error message shows: "BYOLLM Configuration Required: VVD-mimic uses your own LLM account for privacy and control. Connect your account to continue."
- "Configure Now" button present
- Import AI functionality completely inaccessible

**Validation**: ✅ Blocking error prevents Import AI usage without BYOLLM config

---

### Step 2: Navigate to Settings page from blocking error

**Action**:
1. Click "Configure Now" button in blocking error

**Expected Result**:
- Browser navigates to Settings page
- BYOLLM Configuration section visible
- URL updates to `/settings?section=byollm`
- Provider selection UI displayed

**Validation**: ✅ Direct link to Settings from blocking error works

---

### Step 3: View provider selection options

**Action**:
1. Observe BYOLLM Configuration section in Settings

**Expected Result**:
- Three provider options displayed: OpenAI, Anthropic, Custom Endpoint
- All providers presented with equal prominence (no default suggested)
- Each provider has description
- Privacy notice displayed: "Your credentials are stored on your machine and never transmitted to VVD-mimic servers"
- Scope selector shows "Global (all campaigns)" selected by default

**Validation**: ✅ Provider selection neutrally presented with privacy notice

---

### Step 4: Select Anthropic provider and choose OAuth

**Action**:
1. Click "Anthropic" provider option
2. Observe authentication method options

**Expected Result**:
- Two auth method options appear: "Connect via OAuth" and "Enter API Key"
- OAuth option is primary (recommended)
- API key option has link to console.anthropic.com/settings/billing
- "Connect via OAuth" button enabled

**Validation**: ✅ Anthropic provider shows both OAuth and API key options

---

### Step 5: Initiate OAuth authorization flow

**Action**:
1. Click "Connect via OAuth" button

**Expected Result**:
- Frontend sends POST request to `/api/byollm/oauth/initiate`
- Response contains `authorization_url`
- New browser tab/window opens to Anthropic OAuth page: console.anthropic.com/oauth/authorize
- OAuth page shows VVD-mimic app name, requested scopes: "Read account info, Read credits/usage, Make API calls"
- Original Settings tab shows "Waiting for authorization..." spinner

**API Call**: `POST /api/byollm/oauth/initiate` with `{ provider: "anthropic", scope: "global" }`

**Validation**: ✅ OAuth flow initiated successfully

---

### Step 6: Authorize VVD-mimic on Anthropic OAuth page

**Action**:
1. On Anthropic OAuth page, click "Authorize" button

**Expected Result**:
- Anthropic redirects back to VVD-mimic: `http://localhost:3000/api/byollm/oauth/callback?code=...&state=...`
- Backend exchanges authorization code for access token and refresh token
- Backend creates BYOLLMConfig entity with encrypted OAuth tokens
- Frontend redirects to Settings page with success message
- OAuth tab closes automatically

**API Call**: `GET /api/byollm/oauth/callback?code={code}&state={state}`

**Validation**: ✅ OAuth callback processed and configuration created

---

### Step 7: View connected account information

**Action**:
1. Observe BYOLLM Configuration section after OAuth success

**Expected Result**:
- Connection status shows: "✓ Connected to Anthropic"
- Organization name displayed: "Personal" or user's org name
- Remaining credits displayed: "$45.30" (or actual balance)
- Credits fetched from Anthropic API
- Last updated timestamp shown
- Model selection dropdown appears

**API Call**: `GET /api/byollm/credits?scope=global`

**Validation**: ✅ Account connection successful with credits displayed

---

### Step 8: Select Claude 3.5 Sonnet model

**Action**:
1. Click model selection dropdown
2. Observe available models

**Expected Result**:
- Model dropdown shows:
  - Claude 3.5 Sonnet (200k context)
  - Claude 3 Opus (200k context)
  - Claude 3 Haiku (200k context)
- Each model shows context window size
- Select "Claude 3.5 Sonnet"
- Model selection saved

**API Call**: `GET /api/byollm/models?provider=anthropic`

**Validation**: ✅ Model selection works with context window info displayed

---

### Step 9: Add custom system prompt for Import AI

**Action**:
1. Scroll to "Custom System Prompts" section
2. Expand "Import AI Prompt" text area
3. Enter: "Always preserve my D&D 3.5e terminology. Do not convert to 5e."
4. Save prompt

**Expected Result**:
- Text area accepts input
- Character count displayed (optional)
- Prompt saved to BYOLLMConfig entity
- Success notification shown

**Validation**: ✅ Custom system prompt saved

---

### Step 10: Test connection with bulk MCP validation

**Action**:
1. Click "Test Connection" button

**Expected Result**:
- Frontend sends POST request to `/api/byollm/test-connection`
- Backend makes real API call to Anthropic with test message
- Loading spinner shows during test
- Success message displays: "✓ Connection successful! Bulk operations ready."
- Details show:
  - Provider: Anthropic
  - Model: Claude 3.5 Sonnet
  - Context Window: 200,000 tokens

**API Call**: `POST /api/byollm/test-connection?scope=global`

**Validation**: ✅ Connection test validates bulk MCP operations

---

### Step 11: Save BYOLLM configuration

**Action**:
1. Click "Save Configuration" button

**Expected Result**:
- Configuration saved to SQLite database
- OAuth tokens encrypted with AES-256-GCM
- Success notification displayed
- Settings page shows "Configuration Active" status
- "Edit Configuration" button available

**API Call**: `POST /api/byollm/config` (if creating new) or implicitly saved during connection test

**Validation**: ✅ Configuration saved successfully

---

### Step 12: Verify Import AI now accessible

**Action**:
1. Navigate back to campaign page
2. Click "Import" tab

**Expected Result**:
- Import AI interface loads successfully
- No blocking error displayed
- Import text area accessible
- "Process with AI" button enabled
- Subtle indicator shows active BYOLLM config (e.g., "Using Claude 3.5 Sonnet")

**Validation**: ✅ Import AI accessible after BYOLLM configuration

---

### Step 13: Verify Planning AI now accessible

**Action**:
1. Navigate to Planning tab

**Expected Result**:
- Planning AI interface loads successfully
- No blocking error displayed
- Planning input accessible
- Custom system prompt applied (if configured)

**Validation**: ✅ Planning AI accessible after BYOLLM configuration

---

### Step 14: Create per-campaign BYOLLM configuration

**Action**:
1. Navigate to Settings page
2. Change scope selector from "Global" to "Campaign: [Campaign Name]"
3. Select "Custom Endpoint" provider
4. Enter base URL: `http://localhost:11434` (Ollama)
5. Enter model name: `llama2:13b`
6. Select auth method: "None"
7. Click "Test Connection"

**Expected Result**:
- Connection test attempts to reach Ollama endpoint
- If Ollama running: Success message "✓ Connected to custom endpoint at http://localhost:11434 with model llama2:13b"
- If Ollama not running: Error message "Cannot connect to http://localhost:11434. Ensure your local LLM service is running."
- No credits section displayed (custom endpoint doesn't have credits)
- Per-campaign config created, overriding global config for this campaign only

**API Call**: `POST /api/byollm/test-connection?scope=campaign&campaign_id={id}`

**Validation**: ✅ Per-campaign configuration with Custom Endpoint works

---

### Step 15: Verify per-campaign config overrides global

**Action**:
1. Navigate to campaign with per-campaign config
2. Check Import AI interface

**Expected Result**:
- Import AI shows "Using llama2:13b (Custom Endpoint)" instead of global Anthropic config
- Import operations use Ollama instead of Anthropic
- Other campaigns still use global Anthropic config

**Validation**: ✅ Per-campaign config correctly overrides global

---

### Step 16: Delete per-campaign config and revert to global

**Action**:
1. Navigate to Settings page
2. Ensure "Campaign: [Campaign Name]" scope selected
3. Click "Delete Campaign Configuration" button
4. Confirm deletion in modal

**Expected Result**:
- Per-campaign config deleted from database
- Settings page immediately shows global config
- Confirmation message: "Campaign configuration deleted. Reverted to global configuration."
- Campaign now uses global Anthropic config again

**API Call**: `DELETE /api/byollm/config?campaign_id={id}`

**Validation**: ✅ Deleting per-campaign config reverts to global

---

### Step 17: Test alternative auth method - API key

**Action**:
1. Navigate to Settings page (global scope)
2. Click "Disconnect" to remove OAuth config
3. Select "Anthropic" provider again
4. Choose "Enter API Key" auth method
5. Enter API key from console.anthropic.com
6. Click "Test Connection"

**Expected Result**:
- API key input field masked (shows `sk-ant-api03-****`)
- Test connection validates API key
- Connection successful (same as OAuth flow)
- Credits fetched using API key auth
- Model selection same as OAuth

**Validation**: ✅ API key authentication alternative works

---

### Step 18: Test rate limit handling (manual trigger)

**Action**:
1. Use Import AI to process multiple large documents rapidly
2. Trigger rate limit on Anthropic API

**Expected Result**:
- Rate limit error detected by backend
- Automatic retry initiated with exponential backoff
- User notification displayed: "Rate limit reached, retrying in 5 seconds..."
- Retry countdown shown in UI
- After delay, request retries automatically
- If successful: operation completes normally
- If rate limit persists after 3 retries: graceful failure with "Manual Retry" button

**Validation**: ✅ Rate limit automatic retry works

---

### Step 19: Test expired OAuth token handling

**Action**:
1. Wait for OAuth access token to expire (or manually set expiry in database for testing)
2. Attempt to use Import AI

**Expected Result**:
- Backend detects expired access token
- Backend automatically uses refresh token to get new access token
- New access token encrypted and stored
- Import operation proceeds without user interruption
- No user-visible error (seamless token refresh)

**Validation**: ✅ OAuth token refresh automatic

---

### Step 20: Test graceful failure on API error

**Action**:
1. Disconnect network or block Anthropic API
2. Attempt Import AI operation

**Expected Result**:
- API call fails with network error
- Import operation stops gracefully (doesn't crash)
- Error message displayed: "Network error - check connection and retry"
- "Retry" button available
- User's work preserved (no data loss)

**Validation**: ✅ Graceful failure on API errors

---

## Additional Validation Tests

### Test A: Low credits warning

**Action**:
1. Configure Anthropic account with balance < $5.00 (or mock for testing)
2. Navigate to Settings page

**Expected Result**:
- Credits display shows warning icon: "⚠ Low balance: $3.20"
- Link to Anthropic billing page: "Add Credits"
- Warning does not block usage (informational only)

**Validation**: ✅ Low credits warning displayed

---

### Test B: Invalid credentials error

**Action**:
1. Enter invalid API key
2. Click "Test Connection"

**Expected Result**:
- Connection test fails
- Error message: "Invalid credentials. Please reconnect your account."
- Configuration not saved
- User can retry with correct credentials

**Validation**: ✅ Invalid credentials detected and reported

---

### Test C: Custom Endpoint with auth

**Action**:
1. Select Custom Endpoint
2. Enter base URL: `http://localhost:8000`
3. Select auth method: "API Key"
4. Enter API key
5. Enter model name
6. Test connection

**Expected Result**:
- Connection test sends Authorization header with API key
- If auth successful: connection validates
- If auth fails: clear error message

**Validation**: ✅ Custom Endpoint auth works

---

### Test D: Scope indicator in Import/Planning UI

**Action**:
1. Configure global config (Anthropic Claude 3.5 Sonnet)
2. Configure per-campaign config (Ollama llama2)
3. Navigate between campaigns

**Expected Result**:
- Campaign with per-campaign config shows: "Using llama2:13b (Custom)" in Import UI
- Campaign without per-campaign config shows: "Using Claude 3.5 Sonnet (Anthropic)" in Import UI
- Clear visual indicator of which config is active

**Validation**: ✅ Active config clearly indicated in UI

---

### Test E: File upload for custom system prompt

**Action**:
1. Navigate to Custom System Prompts section
2. Click "Upload File" for Import AI prompt
3. Select .txt or .md file with custom instructions
4. Save configuration

**Expected Result**:
- File content loaded into prompt
- File size limit: 10KB (reasonable for prompts)
- File content saved to BYOLLMConfig
- Prompt used in subsequent Import operations

**Validation**: ✅ File upload for custom prompts works

---

## Success Criteria

✅ All 20 primary validation steps pass
✅ All 5 additional validation tests (A-E) pass
✅ Blocking error prevents Import/Planning AI without config
✅ OAuth flow completes successfully (OpenAI & Anthropic)
✅ API key alternative works (Anthropic)
✅ Custom Endpoint works (Ollama, LM Studio)
✅ Credits/usage displayed correctly (OpenAI & Anthropic)
✅ Model selection with context window info works
✅ Connection test validates bulk MCP operations
✅ Per-campaign config overrides global config
✅ Deleting per-campaign config reverts to global
✅ Rate limit automatic retry works
✅ OAuth token refresh automatic
✅ Graceful failure on API errors
✅ Custom system prompts applied correctly
✅ Privacy notice displayed prominently
✅ No credentials transmitted to VVD-mimic servers
✅ All credentials encrypted with AES-256-GCM

---

## Known Limitations (Acceptable for Prototype)

- OAuth token refresh requires valid refresh token (if revoked, user must re-authorize)
- Encryption is prototype-level (not production-grade, no HSM/KMS)
- Model list for Anthropic manually coded (no auto-fetch API yet)
- Custom Endpoint assumes OpenAI-compatible format
- No multi-account support (one set of credentials per scope)
- Credits refresh cached for 5 minutes (may be slightly stale)
- No budget limits or spending alerts (beyond provider's own limits)

---

**Quickstart Validation Complete**: Feature 008 ready for implementation if all tests pass.
