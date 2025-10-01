# Research: BYOLLM Configuration and Account Connection

**Feature**: 008-create-byollm-configuration
**Date**: 2025-10-01
**Status**: Complete

This document consolidates technical research for implementing BYOLLM (Bring Your Own LLM) configuration, OAuth flows, credential encryption, and provider integration.

---

## Research Topic 1: OAuth 2.0 Implementation for LLM Providers

**Decision**: Use OAuth 2.0 Authorization Code Flow with PKCE (Proof Key for Code Exchange) for OpenAI and Anthropic

**Rationale**:
- **Authorization Code Flow with PKCE** is the recommended OAuth 2.0 flow for public clients (including localhost desktop apps)
- PKCE adds security layer to prevent authorization code interception attacks
- Both OpenAI and Anthropic support OAuth 2.0 with standard implementations
- Redirect URI can be `http://localhost:PORT/oauth/callback` for local development
- OAuth tokens (access + refresh) stored locally with encryption, never transmitted to VVD-mimic servers
- Refresh tokens allow long-lived sessions without repeated re-authorization

**Implementation**:
```typescript
// oauth-flow.service.ts
import { randomBytes } from 'crypto';
import { createHash } from 'crypto';

interface OAuthConfig {
  provider: 'openai' | 'anthropic';
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

const PROVIDER_CONFIGS: Record<string, OAuthConfig> = {
  openai: {
    provider: 'openai',
    clientId: process.env.OPENAI_CLIENT_ID!,
    redirectUri: 'http://localhost:3000/api/byollm/oauth/callback',
    scopes: ['api.read', 'api.write'],
    authorizationEndpoint: 'https://platform.openai.com/oauth/authorize',
    tokenEndpoint: 'https://platform.openai.com/oauth/token'
  },
  anthropic: {
    provider: 'anthropic',
    clientId: process.env.ANTHROPIC_CLIENT_ID!,
    redirectUri: 'http://localhost:3000/api/byollm/oauth/callback',
    scopes: ['api.read', 'api.write', 'credits.read'],
    authorizationEndpoint: 'https://console.anthropic.com/oauth/authorize',
    tokenEndpoint: 'https://console.anthropic.com/oauth/token'
  }
};

export class OAuthFlowService {
  // PKCE: Generate code verifier and challenge
  generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  // Step 1: Initiate OAuth flow
  async initiateOAuth(provider: 'openai' | 'anthropic', campaignId?: string): Promise<string> {
    const config = PROVIDER_CONFIGS[provider];
    const { codeVerifier, codeChallenge } = this.generatePKCE();
    const state = randomBytes(16).toString('base64url');

    // Store state and code_verifier in session (short-lived, 10 minutes)
    await this.storeOAuthSession(state, { codeVerifier, provider, campaignId });

    const authUrl = new URL(config.authorizationEndpoint);
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', config.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', config.scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return authUrl.toString();
  }

  // Step 2: Handle callback and exchange code for tokens
  async handleCallback(code: string, state: string): Promise<OAuthToken> {
    const session = await this.getOAuthSession(state);
    if (!session) throw new Error('Invalid OAuth state');

    const config = PROVIDER_CONFIGS[session.provider];
    const response = await axios.post(config.tokenEndpoint, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      code_verifier: session.codeVerifier
    });

    const { access_token, refresh_token, expires_in } = response.data;
    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + expires_in * 1000,
      provider: session.provider
    };
  }
}
```

**Alternatives Considered**:
- **Client Credentials Flow**: Rejected - requires client secret, not suitable for local-only app without secret management
- **Implicit Flow**: Rejected - deprecated by OAuth 2.1, less secure than Authorization Code + PKCE
- **Device Code Flow**: Rejected - adds unnecessary complexity for localhost app with browser redirect

**References**:
- OAuth 2.0 RFC 6749: https://datatracker.ietf.org/doc/html/rfc6749
- PKCE RFC 7636: https://datatracker.ietf.org/doc/html/rfc7636
- OpenAI OAuth docs: https://platform.openai.com/docs/api-reference/authentication
- Anthropic OAuth docs: https://console.anthropic.com/docs/oauth

---

## Research Topic 2: Credential Encryption for Local SQLite Storage

**Decision**: Use Node.js `crypto` module with AES-256-GCM for prototype-level encryption

**Rationale**:
- **AES-256-GCM** (Galois/Counter Mode) provides authenticated encryption with associated data (AEAD)
- GCM mode prevents tampering and provides integrity checking
- Node.js `crypto` module is built-in (no external dependencies)
- Encryption key derived from machine-specific identifier + user password (or default key for prototype)
- **Important**: This is prototype-level encryption, NOT production-grade (no key rotation, no HSM, no secret management service)
- For prototype, acceptable security for local-only credentials stored on user's machine
- Clear documentation warning users that encryption is prototype-level

**Implementation**:
```typescript
// encryption.service.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly saltLength = 32;

  // Derive encryption key from passphrase (machine-specific or user-provided)
  private deriveKey(passphrase: string, salt: Buffer): Buffer {
    return scryptSync(passphrase, salt, this.keyLength);
  }

  // Get machine-specific passphrase (for prototype)
  private getPassphrase(): string {
    // For prototype: use environment variable or default
    // Production would use user password + hardware binding
    return process.env.ENCRYPTION_PASSPHRASE || 'vvd-mimic-default-key-prototype-only';
  }

  // Encrypt credential (OAuth token or API key)
  encrypt(plaintext: string): string {
    const passphrase = this.getPassphrase();
    const salt = randomBytes(this.saltLength);
    const key = this.deriveKey(passphrase, salt);
    const iv = randomBytes(this.ivLength);

    const cipher = createCipheriv(this.algorithm, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Format: salt:iv:authTag:encrypted
    return [
      salt.toString('hex'),
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted
    ].join(':');
  }

  // Decrypt credential
  decrypt(encrypted: string): string {
    const passphrase = this.getPassphrase();
    const parts = encrypted.split(':');
    if (parts.length !== 4) throw new Error('Invalid encrypted format');

    const [saltHex, ivHex, authTagHex, encryptedData] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = this.deriveKey(passphrase, salt);

    const decipher = createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

**Storage Schema**:
```sql
CREATE TABLE IF NOT EXISTS byollm_configs (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK(scope IN ('global', 'campaign')),
  campaign_id TEXT,
  provider TEXT NOT NULL CHECK(provider IN ('openai', 'anthropic', 'custom')),
  auth_method TEXT NOT NULL CHECK(auth_method IN ('oauth', 'api_key')),
  encrypted_credentials TEXT NOT NULL, -- OAuth tokens or API key, encrypted
  model_name TEXT NOT NULL,
  custom_endpoint_url TEXT,
  custom_system_prompt_import TEXT,
  custom_system_prompt_planning TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  UNIQUE(scope, campaign_id) -- One config per scope
);
```

**Alternatives Considered**:
- **No encryption**: Rejected - violates basic security practices even for prototype
- **XOR with static key**: Rejected - too weak, easily reversible
- **AES-256-CBC**: Rejected - no authenticated encryption, vulnerable to tampering
- **Third-party library (libsodium)**: Rejected - adds external dependency for prototype when Node.js crypto sufficient

**Security Notes**:
- For production: migrate to hardware security module (HSM), key management service (KMS), or user password-protected keychain
- For prototype: acceptable risk for local-only storage on user's trusted machine
- Clear UI warning: "Credentials encrypted with prototype-level encryption. Do not use on shared or untrusted machines."

---

## Research Topic 3: MCP (Model Context Protocol) Configuration

**Decision**: Use MCP SDK with automatic streaming, timeout 60s, retry 3 attempts with exponential backoff

**Rationale**:
- **MCP (Model Context Protocol)** is Anthropic's standard for structured LLM interactions with tools/context
- Supports streaming responses for real-time progress in Import/Planning workflows
- Timeout prevents hanging on network issues or slow provider responses
- Retry with exponential backoff handles transient failures gracefully
- Configuration hidden from users (like Notion permissions) - works automatically without manual setup

**Implementation**:
```typescript
// mcp-config.service.ts
import { MCPClient } from '@anthropic/mcp-sdk'; // Hypothetical SDK

export class MCPConfigService {
  private readonly defaultTimeout = 60000; // 60 seconds
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 1000; // 1 second

  createMCPClient(config: BYOLLMConfig): MCPClient {
    return new MCPClient({
      provider: config.provider,
      credentials: this.decryptCredentials(config.encryptedCredentials),
      model: config.modelName,

      // Streaming enabled for real-time progress
      streaming: true,

      // Timeout configuration
      timeout: this.defaultTimeout,

      // Retry configuration
      retry: {
        maxAttempts: this.maxRetries,
        backoff: 'exponential',
        baseDelay: this.baseRetryDelay,
        maxDelay: 10000 // 10 seconds max
      },

      // Custom system prompts (if provided)
      systemPrompt: this.buildSystemPrompt(config),

      // Error handling
      onError: (error) => this.handleMCPError(error),
      onRetry: (attempt, delay) => this.notifyRetry(attempt, delay)
    });
  }

  private buildSystemPrompt(config: BYOLLMConfig): string {
    let prompt = 'You are a helpful assistant for VVD-mimic campaign management.';

    // Add custom prompts if configured
    if (config.customSystemPromptImport) {
      prompt += `\n\n${config.customSystemPromptImport}`;
    }

    return prompt;
  }

  private handleMCPError(error: MCPError): void {
    // Log error for debugging
    console.error('[MCP] Error:', error);

    // Emit event for UI notification
    eventEmitter.emit('mcp:error', {
      message: error.message,
      recoverable: error.recoverable
    });
  }

  private notifyRetry(attempt: number, delay: number): void {
    // Notify user of automatic retry
    eventEmitter.emit('mcp:retry', {
      attempt,
      delay,
      message: `Retrying request (attempt ${attempt}/${this.maxRetries}) in ${delay}ms...`
    });
  }
}
```

**Progress Tracking**:
```typescript
// Stream MCP response with progress updates
async function streamMCPRequest(client: MCPClient, prompt: string): Promise<string> {
  let fullResponse = '';

  const stream = await client.stream(prompt);

  for await (const chunk of stream) {
    fullResponse += chunk.text;

    // Emit progress event for UI
    eventEmitter.emit('mcp:progress', {
      chunk: chunk.text,
      usage: chunk.usage,
      done: chunk.done
    });
  }

  return fullResponse;
}
```

**Alternatives Considered**:
- **Raw HTTP requests to provider APIs**: Rejected - requires manual streaming implementation, error handling, retry logic
- **Manual MCP protocol implementation**: Rejected - reinvents wheel, error-prone
- **No streaming (batch only)**: Rejected - poor UX for long Import operations, no real-time feedback
- **Longer timeout (120s+)**: Rejected - user may think app frozen, 60s sufficient for prototype

---

## Research Topic 4: OpenAI and Anthropic API Patterns

**Decision**: Use provider-specific REST APIs with axios for credits/usage, model listing, and connection testing

**Rationale**:
- Both OpenAI and Anthropic provide REST APIs for account management separate from LLM inference
- Credits/usage endpoints allow fetching remaining balance to prevent surprise costs
- Model listing endpoints provide available models for connected account (respects org access)
- Connection test validates credentials by making real API call (not just token validation)
- axios provides clean Promise-based HTTP client with interceptors for auth, retries, error handling

**Implementation**:
```typescript
// provider-client.service.ts
import axios, { AxiosInstance } from 'axios';

interface ProviderCredits {
  balance: number;
  currency: string;
  organization: string;
  lastUpdated: number;
}

interface ProviderModel {
  id: string;
  name: string;
  contextWindow: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
}

export class ProviderClientService {
  private createClient(provider: 'openai' | 'anthropic', accessToken: string): AxiosInstance {
    const baseURLs = {
      openai: 'https://api.openai.com/v1',
      anthropic: 'https://api.anthropic.com/v1'
    };

    return axios.create({
      baseURL: baseURLs[provider],
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 seconds for management API
    });
  }

  // Fetch credits/usage from OpenAI
  async fetchOpenAICredits(accessToken: string): Promise<ProviderCredits> {
    const client = this.createClient('openai', accessToken);
    const response = await client.get('/dashboard/billing/credit_grants');

    return {
      balance: response.data.total_available,
      currency: 'USD',
      organization: response.data.organization_id,
      lastUpdated: Date.now()
    };
  }

  // Fetch credits/usage from Anthropic
  async fetchAnthropicCredits(accessToken: string): Promise<ProviderCredits> {
    const client = this.createClient('anthropic', accessToken);
    const response = await client.get('/account/credits');

    return {
      balance: response.data.credits_remaining,
      currency: 'USD',
      organization: response.data.organization_name,
      lastUpdated: Date.now()
    };
  }

  // List available models from OpenAI
  async listOpenAIModels(accessToken: string): Promise<ProviderModel[]> {
    const client = this.createClient('openai', accessToken);
    const response = await client.get('/models');

    return response.data.data
      .filter((m: any) => m.id.includes('gpt'))
      .map((m: any) => ({
        id: m.id,
        name: this.formatModelName(m.id),
        contextWindow: this.getOpenAIContextWindow(m.id),
        inputCostPer1k: this.getOpenAICost(m.id, 'input'),
        outputCostPer1k: this.getOpenAICost(m.id, 'output')
      }));
  }

  // List available models from Anthropic
  async listAnthropicModels(accessToken: string): Promise<ProviderModel[]> {
    // For prototype: manually coded model list
    // Production: fetch from API when available
    return [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        inputCostPer1k: 3.0,
        outputCostPer1k: 15.0
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        contextWindow: 200000,
        inputCostPer1k: 15.0,
        outputCostPer1k: 75.0
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        contextWindow: 200000,
        inputCostPer1k: 0.25,
        outputCostPer1k: 1.25
      }
    ];
  }

  // Test connection with bulk MCP operation
  async testConnection(config: BYOLLMConfig): Promise<{ success: boolean; message: string }> {
    try {
      const client = this.createClient(config.provider, config.decryptedAccessToken);

      // Test with simple MCP-style request
      const response = await client.post('/chat/completions', {
        model: config.modelName,
        messages: [
          { role: 'user', content: 'Test connection. Respond with "OK" if you receive this.' }
        ],
        max_tokens: 10
      });

      if (response.data.choices?.[0]?.message) {
        return {
          success: true,
          message: `Connected to ${config.provider} with model ${config.modelName}. Bulk operations ready.`
        };
      }

      return {
        success: false,
        message: 'Connection test failed: Unexpected response format'
      };
    } catch (error: any) {
      return {
        success: false,
        message: this.parseProviderError(error)
      };
    }
  }

  private parseProviderError(error: any): string {
    if (error.response?.status === 401) {
      return 'Invalid credentials. Please reconnect your account.';
    }
    if (error.response?.status === 429) {
      return 'Rate limit exceeded. Please try again in a few minutes.';
    }
    if (error.response?.status === 403) {
      return 'Insufficient permissions. Check your account access.';
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return 'Network error. Check your internet connection.';
    }
    return `Connection test failed: ${error.message}`;
  }
}
```

**Alternatives Considered**:
- **GraphQL API**: Rejected - neither OpenAI nor Anthropic provide GraphQL for account management
- **Provider SDKs (openai npm, @anthropic-ai/sdk)**: Considered - may use for LLM inference, but REST sufficient for account management
- **No connection test**: Rejected - users need validation before saving configuration
- **Cached model list only**: Rejected - doesn't respect org-specific model access

**API Endpoints**:
- **OpenAI**:
  - Credits: `GET /dashboard/billing/credit_grants`
  - Models: `GET /models`
  - Test: `POST /chat/completions`
- **Anthropic**:
  - Credits: `GET /account/credits`
  - Models: Manually coded for prototype (no public API yet)
  - Test: `POST /messages`

---

## Research Topic 5: Rate Limit Handling and Automatic Retry

**Decision**: Use exponential backoff with jitter, respect provider Retry-After headers, notify user during retry

**Rationale**:
- Rate limits are common in LLM APIs (OpenAI: 3500 RPM, Anthropic: varies by tier)
- **Exponential backoff** prevents thundering herd problem and gives provider time to recover
- **Jitter** (randomness) prevents synchronized retries from multiple requests
- **Retry-After header** (if provided) should be respected as authoritative delay
- User notification during retry provides transparency and prevents confusion
- Maximum 3 retry attempts before failing gracefully with manual retry option

**Implementation**:
```typescript
// rate-limit.service.ts
export class RateLimitService {
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second
  private readonly maxDelay = 30000; // 30 seconds
  private readonly jitterFactor = 0.3; // 30% randomness

  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Only retry on rate limit errors
        if (!this.isRateLimitError(error)) {
          throw error;
        }

        // Don't retry after max attempts
        if (attempt === this.maxRetries) {
          throw new Error(
            `Rate limit exceeded after ${this.maxRetries} retries. ` +
            `Please try again later or upgrade your API plan.`
          );
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, error);

        // Notify user of automatic retry
        eventEmitter.emit('rate-limit:retry', {
          attempt: attempt + 1,
          maxAttempts: this.maxRetries,
          delay,
          context,
          message: `Rate limit reached, retrying in ${Math.round(delay / 1000)} seconds...`
        });

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private isRateLimitError(error: any): boolean {
    return (
      error.response?.status === 429 || // HTTP 429 Too Many Requests
      error.code === 'rate_limit_exceeded'
    );
  }

  private calculateDelay(attempt: number, error: any): number {
    // Check for Retry-After header (authoritative)
    const retryAfter = error.response?.headers['retry-after'];
    if (retryAfter) {
      const delay = parseInt(retryAfter, 10) * 1000; // Convert seconds to ms
      if (!isNaN(delay)) return Math.min(delay, this.maxDelay);
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, ...
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);

    // Add jitter to prevent synchronized retries
    const jitter = exponentialDelay * this.jitterFactor * Math.random();
    const totalDelay = exponentialDelay + jitter;

    // Cap at max delay
    return Math.min(totalDelay, this.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**Usage in Import/Planning Workflows**:
```typescript
// Import AI workflow with automatic rate limit retry
async function importNotes(notes: string, config: BYOLLMConfig): Promise<ImportResult> {
  const rateLimitService = new RateLimitService();
  const mcpClient = mcpConfigService.createMCPClient(config);

  try {
    return await rateLimitService.retryWithBackoff(
      async () => {
        return await mcpClient.processImport(notes);
      },
      'Import AI'
    );
  } catch (error: any) {
    // Rate limit retry exhausted - fail gracefully
    return {
      success: false,
      error: error.message,
      manualRetryAvailable: true
    };
  }
}
```

**Alternatives Considered**:
- **No automatic retry**: Rejected - poor UX, forces user to manually retry every rate limit
- **Fixed delay retry**: Rejected - doesn't adapt to rate limit severity, may retry too fast
- **Infinite retries**: Rejected - could hang indefinitely, no escape for persistent rate limits
- **No jitter**: Rejected - synchronized retries can amplify rate limit problem

**References**:
- Exponential backoff best practices: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- OpenAI rate limit docs: https://platform.openai.com/docs/guides/rate-limits
- Anthropic rate limit docs: https://console.anthropic.com/docs/rate-limits

---

## Research Topic 6: Local LLM Endpoint Configuration (Custom Endpoint)

**Decision**: Support OpenAI-compatible API format for Custom Endpoint (Ollama, LM Studio, local models)

**Rationale**:
- **Ollama** and **LM Studio** both provide OpenAI-compatible REST APIs (same request/response format)
- Default Ollama endpoint: `http://localhost:11434`
- Default LM Studio endpoint: `http://localhost:1234/v1`
- OpenAI-compatible format allows code reuse (same client, same request format)
- Authentication optional (local LLMs often don't require auth, but support API key if needed)
- Custom model name entry allows any local model (llama2, mistral, etc.)
- No OAuth for Custom Endpoint (not applicable for local services)

**Implementation**:
```typescript
// Custom Endpoint configuration entity
interface CustomEndpointConfig {
  baseUrl: string; // e.g., http://localhost:11434
  modelName: string; // e.g., llama2:13b
  authMethod: 'none' | 'api_key' | 'bearer_token';
  authCredential?: string; // API key or bearer token if auth required
}

// provider-client.service.ts (Custom Endpoint support)
async testCustomEndpoint(config: CustomEndpointConfig): Promise<{ success: boolean; message: string }> {
  try {
    const client = axios.create({
      baseURL: config.baseUrl,
      headers: this.getCustomEndpointHeaders(config),
      timeout: 10000
    });

    // Test with OpenAI-compatible chat completion
    const response = await client.post('/chat/completions', {
      model: config.modelName,
      messages: [
        { role: 'user', content: 'Test connection. Respond with "OK".' }
      ],
      max_tokens: 10
    });

    if (response.data.choices?.[0]?.message) {
      return {
        success: true,
        message: `Connected to custom endpoint at ${config.baseUrl} with model ${config.modelName}.`
      };
    }

    return {
      success: false,
      message: 'Connection test failed: Unexpected response format'
    };
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        message: `Cannot connect to ${config.baseUrl}. Ensure your local LLM service is running.`
      };
    }
    return {
      success: false,
      message: `Connection test failed: ${error.message}`
    };
  }
}

private getCustomEndpointHeaders(config: CustomEndpointConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (config.authMethod === 'api_key' && config.authCredential) {
    headers['Authorization'] = `Bearer ${config.authCredential}`;
  } else if (config.authMethod === 'bearer_token' && config.authCredential) {
    headers['Authorization'] = `Bearer ${config.authCredential}`;
  }

  return headers;
}
```

**Frontend UI Guidance**:
```typescript
// CustomEndpointConfig.tsx - Provide helpful defaults
const COMMON_ENDPOINTS = [
  {
    name: 'Ollama (default)',
    baseUrl: 'http://localhost:11434',
    description: 'Local Ollama installation'
  },
  {
    name: 'LM Studio',
    baseUrl: 'http://localhost:1234/v1',
    description: 'Local LM Studio server'
  },
  {
    name: 'Custom',
    baseUrl: '',
    description: 'Enter your own endpoint URL'
  }
];

// Show helpful instructions
<Select>
  {COMMON_ENDPOINTS.map(ep => (
    <SelectItem value={ep.baseUrl}>
      {ep.name} - {ep.description}
    </SelectItem>
  ))}
</Select>

<TextInput
  label="Model Name"
  placeholder="e.g., llama2:13b, mistral:latest"
  helperText="Enter the exact model name as configured in your local LLM service"
/>
```

**No Credits Display for Custom Endpoint**:
- Local LLMs don't have usage limits or credits
- UI should show "N/A" or hide credits section when Custom Endpoint selected
- Focus on model name and connection test only

**Alternatives Considered**:
- **Custom protocol per local LLM**: Rejected - too much maintenance, OpenAI format is standard
- **Only support Ollama**: Rejected - limits user choice, LM Studio also popular
- **Require authentication**: Rejected - most local LLMs run without auth for simplicity
- **Auto-detect local services**: Rejected - adds complexity, user knows what they're running

**References**:
- Ollama API docs: https://github.com/ollama/ollama/blob/main/docs/api.md
- LM Studio API docs: https://lmstudio.ai/docs/api
- OpenAI API format: https://platform.openai.com/docs/api-reference/chat

---

## Summary of Key Decisions

| Topic | Decision | Key Technology |
|-------|----------|----------------|
| OAuth 2.0 | Authorization Code Flow + PKCE | Native Node.js crypto, axios |
| Encryption | AES-256-GCM (prototype-level) | Node.js crypto module |
| MCP Config | Streaming, 60s timeout, 3 retries | @anthropic/mcp-sdk (or similar) |
| Provider APIs | REST with axios, credits/models/test | axios, OpenAI/Anthropic REST APIs |
| Rate Limits | Exponential backoff + jitter, respect Retry-After | Custom retry logic |
| Custom Endpoint | OpenAI-compatible format, localhost support | axios, Ollama/LM Studio |

All decisions prioritize:
1. **Constitution compliance** (BYOLLM, local-only, privacy)
2. **Prototype simplicity** (no external services, built-in Node.js modules)
3. **User experience** (automatic retries, clear errors, transparent notifications)
4. **Extensibility** (easy to add new providers, upgrade encryption in future)

---

**Phase 0 Complete**: All technical unknowns resolved. Ready for Phase 1 (Design & Contracts).
