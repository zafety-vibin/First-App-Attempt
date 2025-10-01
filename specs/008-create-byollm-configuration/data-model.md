# Data Model: BYOLLM Configuration and Account Connection

**Feature**: 008-create-byollm-configuration
**Date**: 2025-10-01
**Status**: Complete

This document defines all entities for BYOLLM configuration, including TypeScript interfaces and SQL schemas.

---

## Entity 1: BYOLLMConfig

**Purpose**: Stores user's LLM provider account configuration (credentials, model selection, custom prompts)

**Scope**: Global (all campaigns) or per-campaign (specific campaign only)

**Key Fields**:
- `id`: UUID primary key
- `scope`: 'global' or 'campaign'
- `campaign_id`: Foreign key to campaigns (NULL for global)
- `provider`: 'openai', 'anthropic', or 'custom'
- `auth_method`: 'oauth' or 'api_key'
- `encrypted_credentials`: OAuth tokens or API key, encrypted with AES-256-GCM
- `model_name`: Selected model identifier
- `custom_endpoint_url`: Base URL for custom endpoint (NULL for OpenAI/Anthropic)
- `custom_system_prompt_import`: Optional custom prompt for Import AI
- `custom_system_prompt_planning`: Optional custom prompt for Planning AI
- `created_at`, `updated_at`: Timestamps

**TypeScript Interface**:
```typescript
interface BYOLLMConfig {
  id: string; // UUID
  scope: 'global' | 'campaign';
  campaignId: string | null;
  provider: 'openai' | 'anthropic' | 'custom';
  authMethod: 'oauth' | 'api_key';
  encryptedCredentials: string; // Encrypted OAuth tokens or API key
  modelName: string;
  customEndpointUrl: string | null;
  customSystemPromptImport: string | null;
  customSystemPromptPlanning: string | null;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

// Decrypted credentials (never stored, only in memory)
interface DecryptedOAuthCredentials {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number; // Unix timestamp
}

interface DecryptedAPIKeyCredentials {
  apiKey: string;
}

type DecryptedCredentials = DecryptedOAuthCredentials | DecryptedAPIKeyCredentials;
```

**SQL Schema**:
```sql
CREATE TABLE IF NOT EXISTS byollm_configs (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK(scope IN ('global', 'campaign')),
  campaign_id TEXT,
  provider TEXT NOT NULL CHECK(provider IN ('openai', 'anthropic', 'custom')),
  auth_method TEXT NOT NULL CHECK(auth_method IN ('oauth', 'api_key')),
  encrypted_credentials TEXT NOT NULL,
  model_name TEXT NOT NULL,
  custom_endpoint_url TEXT,
  custom_system_prompt_import TEXT,
  custom_system_prompt_planning TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  UNIQUE(scope, campaign_id) -- One config per scope (global or specific campaign)
);

CREATE INDEX IF NOT EXISTS idx_byollm_configs_scope ON byollm_configs(scope);
CREATE INDEX IF NOT EXISTS idx_byollm_configs_campaign_id ON byollm_configs(campaign_id);
```

**Validation Rules**:
- If `scope = 'global'`, then `campaign_id` MUST be NULL
- If `scope = 'campaign'`, then `campaign_id` MUST NOT be NULL
- If `provider = 'custom'`, then `custom_endpoint_url` MUST NOT be NULL
- If `provider IN ('openai', 'anthropic')`, then `custom_endpoint_url` MUST be NULL
- `encrypted_credentials` MUST be in format: `salt:iv:authTag:encrypted` (from AES-256-GCM)
- `model_name` MUST NOT be empty

**Business Logic**:
- **Scope Resolution**: When retrieving config for a campaign, check for per-campaign config first; if not found, fallback to global config
- **Credential Encryption**: Always encrypt before storing, decrypt only when needed (in memory)
- **OAuth Token Refresh**: If access token expired, use refresh token to get new access token
- **Configuration Override**: Per-campaign config completely overrides global config (no merging)

---

## Entity 2: ProviderCredits

**Purpose**: Caches user's remaining credits/usage from provider API to display in Settings UI

**Lifecycle**: Refreshed when Settings page opens, cached for 5 minutes to reduce API calls

**Key Fields**:
- `config_id`: Foreign key to byollm_configs (one-to-one)
- `balance`: Remaining credits (numeric)
- `currency`: Currency code (USD, EUR, etc.)
- `organization_name`: Account/organization name from provider
- `last_fetched_at`: When credits were last fetched

**TypeScript Interface**:
```typescript
interface ProviderCredits {
  configId: string; // FK to BYOLLMConfig
  balance: number;
  currency: string;
  organizationName: string;
  lastFetchedAt: number; // Unix timestamp
}
```

**SQL Schema**:
```sql
CREATE TABLE IF NOT EXISTS provider_credits (
  config_id TEXT PRIMARY KEY,
  balance REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  organization_name TEXT NOT NULL,
  last_fetched_at INTEGER NOT NULL,
  FOREIGN KEY (config_id) REFERENCES byollm_configs(id) ON DELETE CASCADE
);
```

**Validation Rules**:
- `balance` MUST be >= 0
- `currency` MUST be 3-letter ISO code
- Credits cached for maximum 5 minutes (refresh if older)

**Business Logic**:
- **Credits Warning Threshold**: Show warning if balance < $5.00 (configurable)
- **No Credits for Custom Endpoint**: Custom endpoint doesn't have credits; return NULL or hide credits display
- **Refresh Strategy**: Auto-refresh when Settings page opened if cache older than 5 minutes
- **Failed Refresh**: If API call fails, show cached credits with "Last updated: X minutes ago" warning

---

## Entity 3: OAuthSession

**Purpose**: Temporary storage for OAuth state during authorization flow (prevents CSRF attacks)

**Lifecycle**: Created when OAuth flow initiated, deleted after callback processed (max 10 minutes TTL)

**Key Fields**:
- `state`: OAuth state parameter (random, unique)
- `code_verifier`: PKCE code verifier
- `provider`: Which provider ('openai' or 'anthropic')
- `campaign_id`: Scope for configuration (NULL for global)
- `created_at`: When session created
- `expires_at`: When session expires

**TypeScript Interface**:
```typescript
interface OAuthSession {
  state: string; // Random base64url string
  codeVerifier: string; // PKCE code verifier
  provider: 'openai' | 'anthropic';
  campaignId: string | null;
  createdAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp (created_at + 10 minutes)
}
```

**SQL Schema**:
```sql
CREATE TABLE IF NOT EXISTS oauth_sessions (
  state TEXT PRIMARY KEY,
  code_verifier TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('openai', 'anthropic')),
  campaign_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expires_at ON oauth_sessions(expires_at);
```

**Validation Rules**:
- `state` MUST be cryptographically random (32 bytes base64url)
- `code_verifier` MUST be cryptographically random (32 bytes base64url)
- `expires_at` MUST be `created_at + 600` (10 minutes)
- Sessions MUST be deleted after callback processed (success or failure)

**Business Logic**:
- **CSRF Protection**: State parameter prevents cross-site request forgery
- **PKCE Security**: Code verifier prevents authorization code interception
- **Automatic Cleanup**: Delete expired sessions older than 10 minutes (background job)
- **Single Use**: State can only be used once; delete immediately after callback

---

## Entity 4: MCPConfig

**Purpose**: Automatic MCP (Model Context Protocol) configuration for bulk operations (hidden from user)

**Lifecycle**: Generated automatically when BYOLLMConfig is used; not stored in database (configuration only)

**Key Fields**:
- `streaming`: Always true
- `timeout`: 60000 (60 seconds)
- `maxRetries`: 3
- `baseRetryDelay`: 1000 (1 second)
- `maxRetryDelay`: 10000 (10 seconds)

**TypeScript Interface**:
```typescript
interface MCPConfig {
  streaming: true; // Always enabled
  timeout: 60000; // 60 seconds
  retry: {
    maxAttempts: 3;
    backoff: 'exponential';
    baseDelay: 1000; // 1 second
    maxDelay: 10000; // 10 seconds
  };
}

// MCP configuration is not stored in database - it's a constant
const DEFAULT_MCP_CONFIG: MCPConfig = {
  streaming: true,
  timeout: 60000,
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
    baseDelay: 1000,
    maxDelay: 10000
  }
};
```

**No SQL Schema**: MCP configuration is not stored; it's hardcoded default configuration applied automatically

**Business Logic**:
- **Hidden from User**: Users never see or configure MCP settings (like Notion permissions)
- **Always Applied**: Every Import/Planning AI operation uses MCP configuration
- **Progress Streaming**: Real-time progress updates emitted as MCP streams responses
- **Error Handling**: MCP errors automatically trigger retry logic with exponential backoff

---

## Entity 5: CustomEndpointConfig

**Purpose**: Additional configuration fields for Custom Endpoint provider (local LLMs)

**Note**: Custom Endpoint configuration is embedded in BYOLLMConfig entity (not separate table)

**Key Fields** (subset of BYOLLMConfig):
- `custom_endpoint_url`: Base URL (e.g., http://localhost:11434)
- `encrypted_credentials`: API key or bearer token (if auth required), or empty string for no auth
- `model_name`: Free-form model name (e.g., llama2:13b, mistral:latest)

**TypeScript Interface**:
```typescript
interface CustomEndpointConfig {
  baseUrl: string; // e.g., http://localhost:11434
  modelName: string; // e.g., llama2:13b
  authMethod: 'none' | 'api_key' | 'bearer_token';
  authCredential: string | null; // Encrypted if present
}

// Helper to extract custom endpoint config from BYOLLMConfig
function extractCustomEndpointConfig(config: BYOLLMConfig): CustomEndpointConfig | null {
  if (config.provider !== 'custom') return null;

  return {
    baseUrl: config.customEndpointUrl!,
    modelName: config.modelName,
    authMethod: config.authMethod === 'api_key' ? 'api_key' : 'none',
    authCredential: config.authMethod === 'api_key' ? config.encryptedCredentials : null
  };
}
```

**Validation Rules**:
- `baseUrl` MUST be valid URL (http or https)
- `baseUrl` MUST be accessible from user's machine (connection test validates)
- `modelName` MUST NOT be empty
- If `authMethod = 'api_key'`, then `authCredential` MUST NOT be NULL

**Business Logic**:
- **No Credits Display**: Custom Endpoint doesn't have credits; UI hides credits section
- **OpenAI-Compatible Format**: Custom endpoint MUST support OpenAI chat completion format
- **Connection Test**: Test by making real API call to `/chat/completions` endpoint
- **Helpful Defaults**: UI provides common endpoint URLs (Ollama, LM Studio)

---

## Relationships

```
BYOLLMConfig 1:1 ProviderCredits (optional, only for OpenAI/Anthropic)
BYOLLMConfig N:1 Campaign (if scope = 'campaign')
OAuthSession N:1 Campaign (if scope = 'campaign')

User → [uses] → BYOLLMConfig → [makes API calls to] → LLM Provider
User → [initiates OAuth] → OAuthSession → [redirects to] → LLM Provider
```

## State Transitions

### BYOLLMConfig Lifecycle:
1. **Unconfigured** → User clicks "Configure BYOLLM" in Settings
2. **OAuth Initiated** → OAuthSession created, user redirected to provider
3. **OAuth Callback** → Tokens received, encrypted, BYOLLMConfig created
4. **Configured** → Connection tested, configuration active
5. **Token Expired** → Access token expired, refresh token used to renew
6. **Token Revoked** → User revokes authorization, BYOLLMConfig becomes invalid
7. **Reconfigured** → User updates model, prompts, or switches provider
8. **Deleted** → User deletes per-campaign config, reverts to global

### OAuthSession Lifecycle:
1. **Created** → OAuth flow initiated
2. **Pending** → User authorizing on provider page
3. **Completed** → Callback received, tokens exchanged, session deleted
4. **Expired** → 10 minutes elapsed, session deleted (cleanup job)
5. **Cancelled** → User cancels authorization, session deleted

---

## Summary

| Entity | Purpose | Storage | Lifecycle |
|--------|---------|---------|-----------|
| BYOLLMConfig | User's LLM provider configuration | SQLite (encrypted credentials) | Long-lived (until deleted or revoked) |
| ProviderCredits | Cached credits/usage from provider | SQLite | Cached for 5 minutes, refreshed on demand |
| OAuthSession | Temporary OAuth state (CSRF/PKCE) | SQLite | Short-lived (max 10 minutes) |
| MCPConfig | Automatic MCP settings | Hardcoded constants (not stored) | N/A (always applied) |
| CustomEndpointConfig | Custom endpoint fields | Embedded in BYOLLMConfig | Same as BYOLLMConfig |

All entities follow Constitutional Principle V (BYOLLM & Privacy):
- Credentials encrypted with AES-256-GCM (prototype-level)
- Credentials NEVER transmitted to VVD-mimic servers
- All provider API calls direct from user's machine
- OAuth tokens stored locally only
- Custom endpoint supports offline local LLMs

---

**Phase 1 (Data Model) Complete**: Ready for contract generation.
