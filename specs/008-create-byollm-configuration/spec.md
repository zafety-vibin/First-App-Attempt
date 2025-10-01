# Feature Specification: BYOLLM Configuration and Account Connection

**Feature Branch**: `008-create-byollm-configuration`
**Created**: 2025-10-01
**Status**: Draft
**Input**: User description: "Create BYOLLM configuration and account connection including: Settings interface for LLM provider account connection (user MUST connect own account per Constitution Principle V NON-NEGOTIABLE), support multiple providers (OpenAI via OAuth, Anthropic via OAuth or API key with billing link, local LLMs via custom endpoint), account connection shows remaining credits/usage to prevent surprise costs, model selection with context window info (auto-fetch available models or manual code updates for prototype), connection stored locally with basic encryption (prototype only, not production-grade), test connection validates bulk MCP operations, per-campaign vs global settings (campaign-specific overrides global), optional custom system prompts for Import/Planning AI (text input or file upload), automatic MCP configuration (streaming, timeout, retry) hidden from user like Notion permissions, clear error blocking when no valid connection exists with link to Settings, fail gracefully with manual retry on API errors, automatic retry with notification on rate limits, one set of credentials per scope (global or per-campaign), settings accessible from campaign or global navigation, privacy emphasis (credentials local-only, never transmitted to VVD-mimic), no default provider suggestion (remain neutral)."

---

## User Scenarios & Testing

### Primary User Story
A Game Master has installed VVD-mimic and created their first campaign. They're excited to try the Import AI to parse their 50 pages of notes. They pull down the Import tab and immediately see a message: "BYOLLM Configuration Required: VVD-mimic uses your own LLM account for privacy and control. Connect your account to continue." They click "Configure Now" and are taken to the Settings page. They see provider options: OpenAI, Anthropic, Custom Endpoint (for local LLMs) - no suggestions, all presented neutrally. They select Anthropic and click "Connect Account" which opens an OAuth flow to console.anthropic.com. They authorize VVD-mimic to access their account (read credits, make API calls). After authorization, they're returned to Settings and see: "✓ Connected to Anthropic | Remaining Credits: $45.30 | Organization: Personal". They see a model dropdown with "Claude 3.5 Sonnet (200k context)", "Claude 3 Opus (200k context)", "Claude 3 Haiku (200k context)". They choose Claude 3.5 Sonnet. They click "Test Connection" - the system validates with a bulk MCP operation test and shows "✓ Connection successful! Bulk operations ready." They optionally add a custom system prompt: "Always preserve my D&D 3.5e terminology." They save the configuration. The credentials are stored locally with basic encryption and a privacy notice reminds them: "Your credentials are stored on your machine and never transmitted to VVD-mimic servers." Now they can use Import and Planning AI. Later, they create a second campaign for a different setting and configure campaign-specific settings to use a local Ollama model via Custom Endpoint for that campaign's offline work, while their main campaign still uses Anthropic. If their API hits a rate limit during use, the system automatically retries after a brief delay and notifies them: "Rate limit reached, retrying in 5 seconds..."

### Acceptance Scenarios
1. **Given** I attempt to use Import AI without BYOLLM configuration, **When** I pull down Import tab, **Then** I see blocking error with clear message and direct link to Settings
2. **Given** I attempt to use Planning AI without BYOLLM configuration, **When** I pull down Planning tab, **Then** I see blocking error with clear message and direct link to Settings
3. **Given** I open Settings page, **When** I see BYOLLM section, **Then** I see neutral provider options (OpenAI, Anthropic, Custom Endpoint) with no default suggestions
4. **Given** I select OpenAI as provider, **When** I click "Connect Account", **Then** OAuth flow opens to platform.openai.com for authorization
5. **Given** I select Anthropic as provider, **When** I see connection options, **Then** I can choose OAuth flow OR manual API key entry with link to billing page
6. **Given** I complete OAuth authorization, **When** I return to Settings, **Then** I see connection status with remaining credits/usage displayed
7. **Given** I'm connected to a provider, **When** I view model selection, **Then** I see available models with context window information
8. **Given** I select a model, **When** I click "Test Connection", **Then** system validates by running bulk MCP operation test
9. **Given** my connection test succeeds, **When** I view results, **Then** I see confirmation that bulk operations are ready
10. **Given** my connection test fails, **When** I view error, **Then** I see actionable message explaining issue and how to fix
11. **Given** I have global BYOLLM configuration, **When** I create a new campaign, **Then** it uses global settings by default
12. **Given** I want campaign-specific settings, **When** I configure per-campaign BYOLLM, **Then** that campaign uses its own connection overriding global
13. **Given** I want to customize AI behavior, **When** I add custom system prompt (text input or file upload), **Then** Import/Planning AI use those instructions
14. **Given** I use Import or Planning AI, **When** MCP operations run, **Then** streaming, timeout, and retry are handled automatically like Notion (invisible to me)
15. **Given** my API call fails during Import, **When** error occurs, **Then** system fails gracefully and offers manual retry button
16. **Given** my API hits rate limit during Planning, **When** rate limit occurs, **Then** system automatically retries after delay and notifies me
17. **Given** I have one set of credentials configured, **When** I check scope, **Then** it's either global (all campaigns) or per-campaign (one campaign only)
18. **Given** I want to access settings, **When** I navigate, **Then** settings are accessible from both campaign page and global navigation
19. **Given** I save my configuration, **When** I review privacy, **Then** I see clear notice that credentials are local-only and never transmitted to VVD-mimic
20. **Given** I select Custom Endpoint, **When** I configure, **Then** I enter base URL and authentication for local LLMs (Ollama, LM Studio, etc.)

### Edge Cases
- What happens when OAuth authorization is denied or cancelled?
- What happens when account connection expires or is revoked mid-session?
- What happens when user runs out of credits during Import operation?
- What happens when switching from global to per-campaign settings - are there conflicts?
- What happens when user deletes per-campaign configuration - does it revert to global immediately?
- What happens when provider API is down or unreachable?
- What happens when custom system prompt contains invalid instructions or conflicts with default behavior?
- What happens when test connection succeeds but actual Import/Planning operations fail?

## Requirements

### Functional Requirements

#### Settings Interface & Access
- **FR-001**: System MUST provide Settings page accessible from both campaign page and global navigation
- **FR-002**: Settings page MUST have dedicated BYOLLM Configuration section
- **FR-003**: Settings MUST support both global configuration (applies to all campaigns) and per-campaign configuration
- **FR-004**: Per-campaign settings MUST override global settings when configured
- **FR-005**: Settings page MUST clearly indicate whether viewing global or campaign-specific settings
- **FR-006**: System MUST allow only one set of credentials per scope (global or per-campaign)

#### Constitution Compliance
- **FR-007**: System MUST require users to provide their own LLM account credentials (Constitution Principle V NON-NEGOTIABLE)
- **FR-008**: Import AI MUST be completely blocked without valid BYOLLM configuration
- **FR-009**: Planning AI MUST be completely blocked without valid BYOLLM configuration
- **FR-010**: System MUST display blocking error with clear explanation when BYOLLM not configured
- **FR-011**: Blocking error MUST include direct link to Settings page

#### Provider Support & Neutrality
- **FR-012**: System MUST support multiple LLM providers: OpenAI, Anthropic, Custom Endpoint
- **FR-013**: Provider selection MUST be presented neutrally with no default suggestions or recommendations
- **FR-014**: All providers MUST be presented with equal prominence
- **FR-015**: Users MUST select one provider per configuration (global or per-campaign)

#### Account Connection - OAuth Flow
- **FR-016**: OpenAI provider MUST support OAuth 2.0 authorization flow to platform.openai.com
- **FR-017**: Anthropic provider MUST support OAuth 2.0 authorization flow to console.anthropic.com
- **FR-018**: OAuth flow MUST request necessary scopes: read account info, read credits/usage, make API calls
- **FR-019**: OAuth flow MUST redirect users to provider's authorization page in secure browser context
- **FR-020**: After authorization, users MUST be redirected back to VVD-mimic Settings page
- **FR-021**: System MUST handle OAuth authorization denial or cancellation gracefully with clear message
- **FR-022**: OAuth tokens MUST be stored locally with basic encryption

#### Account Connection - API Key Alternative
- **FR-023**: Anthropic provider MUST support manual API key entry as alternative to OAuth
- **FR-024**: When API key option is selected, system MUST provide direct link to console.anthropic.com/settings/billing
- **FR-025**: API key input MUST be masked/hidden for security
- **FR-026**: System MUST validate API key format before attempting connection

#### Credits & Usage Display
- **FR-027**: After successful account connection, Settings MUST display remaining credits/usage
- **FR-028**: Credits display MUST show current balance to prevent surprise costs
- **FR-029**: System MUST refresh credits/usage display when Settings page is opened
- **FR-030**: System MUST display organization or account name associated with credentials
- **FR-031**: When credits are low, system SHOULD display warning with link to provider billing page

#### Model Selection
- **FR-032**: System MUST provide model selection based on connected provider
- **FR-033**: Model selection MUST display context window size for each model
- **FR-034**: Model list MUST include all models available to the connected account
- **FR-035**: For prototype, model list MAY be manually coded or auto-fetched from provider API
- **FR-036**: OpenAI models SHOULD include: GPT-4 Turbo, GPT-4, GPT-3.5 Turbo (based on API availability)
- **FR-037**: Anthropic models SHOULD include: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku (based on API availability)
- **FR-038**: Custom Endpoint MUST allow free-form model name entry
- **FR-039**: System MUST store selected model with configuration

#### Custom Endpoint Configuration
- **FR-040**: Custom Endpoint provider MUST support local LLM usage (Ollama, LM Studio, etc.)
- **FR-041**: Custom Endpoint MUST allow users to enter base URL
- **FR-042**: Custom Endpoint MUST allow users to enter model name
- **FR-043**: Custom Endpoint MUST support authentication methods: API key, bearer token, or none
- **FR-044**: Custom Endpoint configuration MUST validate URL format
- **FR-045**: System MUST provide guidance for common local LLM setups (Ollama default: http://localhost:11434)

#### Connection Testing & Validation
- **FR-046**: Settings page MUST provide "Test Connection" button
- **FR-047**: Test Connection MUST validate account credentials by making actual API call
- **FR-048**: Test Connection MUST specifically validate bulk MCP operations (not just simple API call)
- **FR-049**: Successful test MUST display: provider name, model name, context window, bulk operations ready status
- **FR-050**: Failed test MUST display actionable error message explaining issue
- **FR-051**: Error messages MUST include: invalid credentials, network error, insufficient permissions, rate limit
- **FR-052**: System MUST validate connection before allowing configuration save
- **FR-053**: System MUST re-validate connection periodically during Import/Planning sessions

#### Local Storage & Encryption
- **FR-054**: All credentials MUST be stored locally on user's machine
- **FR-055**: Credentials MUST NEVER be transmitted to VVD-mimic servers (Constitution Principle V)
- **FR-056**: Credentials MUST be encrypted with basic encryption appropriate for prototype (not production-grade)
- **FR-057**: Encryption MUST be sufficient for local storage security on user's machine
- **FR-058**: System MUST clearly document that encryption is prototype-level only
- **FR-059**: OAuth tokens and API keys MUST be stored with same encryption method
- **FR-060**: Credentials MUST be stored separately per scope (global vs per-campaign)

#### Privacy & Security Messaging
- **FR-061**: Settings page MUST prominently display privacy notice: "Your credentials are stored on your machine and never transmitted to VVD-mimic servers"
- **FR-062**: All API calls MUST go directly from user's machine to their chosen LLM provider
- **FR-063**: System MUST never route API traffic through VVD-mimic infrastructure
- **FR-064**: System MUST use HTTPS for all external API calls to providers
- **FR-065**: Documentation MUST explain BYOLLM privacy benefits clearly

#### MCP Protocol Configuration
- **FR-066**: System MUST use MCP (Model Context Protocol) for bulk operations in Import/Planning workflows
- **FR-067**: MCP configuration MUST include: streaming support, timeout settings, retry logic
- **FR-068**: MCP configuration MUST be automatic and hidden from users (like Notion permissions)
- **FR-069**: Users MUST NOT need to configure MCP settings manually
- **FR-070**: System MUST use reasonable default MCP timeout (e.g., 60 seconds)
- **FR-071**: System MUST use reasonable default retry attempts (e.g., 3 attempts)
- **FR-072**: MCP operations MUST support streaming responses for real-time progress
- **FR-073**: MCP operations MUST display progress indicators to users during execution

#### Custom System Prompts
- **FR-074**: Users MUST be able to optionally add custom system prompts for Import AI
- **FR-075**: Users MUST be able to optionally add custom system prompts for Planning AI
- **FR-076**: Custom prompts MUST support text input (inline editor in Settings)
- **FR-077**: Custom prompts MUST support file upload (.txt, .md files)
- **FR-078**: Custom prompts MUST be added to default system behavior (not replacing it)
- **FR-079**: System MUST provide examples of useful custom prompts (preserve terminology, follow formatting rules, prioritize entities)
- **FR-080**: Custom prompts MUST be stored per-configuration (global or per-campaign)
- **FR-081**: Custom prompts MUST be included in Test Connection validation

#### Error Handling - Blocking
- **FR-082**: When Import tab is accessed without BYOLLM configuration, system MUST display blocking error
- **FR-083**: When Planning tab is accessed without BYOLLM configuration, system MUST display blocking error
- **FR-084**: Blocking error MUST include: clear explanation of BYOLLM requirement, reason for requirement (privacy), direct link to Settings
- **FR-085**: Import and Planning features MUST be completely non-functional without valid configuration

#### Error Handling - Graceful Failure
- **FR-086**: When API call fails during Import operation, system MUST fail gracefully
- **FR-087**: Graceful failure MUST preserve user's work and session state
- **FR-088**: Graceful failure MUST display clear error message with manual "Retry" button
- **FR-089**: When API call fails during Planning operation, system MUST fail gracefully with same behavior
- **FR-090**: Error messages MUST be actionable: "Network error - check connection and retry", "Invalid credentials - update settings", "Insufficient credits - add credits at [link]"

#### Error Handling - Rate Limits
- **FR-091**: When API rate limit is encountered, system MUST automatically retry after appropriate delay
- **FR-092**: Automatic retry MUST wait for provider-specified delay (from API response) or reasonable default (e.g., 5 seconds)
- **FR-093**: System MUST notify user during automatic retry: "Rate limit reached, retrying in X seconds..."
- **FR-094**: User MUST be able to cancel automatic retry if desired
- **FR-095**: After maximum retry attempts, system MUST fail gracefully with manual retry option

#### Error Handling - Expired Credentials
- **FR-096**: When OAuth token expires, system MUST detect and prompt user to re-authorize
- **FR-097**: When API key is revoked, system MUST detect and prompt user to update credentials
- **FR-098**: Expired credential detection MUST not interrupt active operations (wait for natural pause)
- **FR-099**: System MUST provide clear re-authorization flow without losing configuration

#### Configuration Management
- **FR-100**: Users MUST be able to edit BYOLLM configuration at any time
- **FR-101**: Users MUST be able to switch providers without losing other settings
- **FR-102**: Users MUST be able to delete per-campaign configuration to revert to global settings
- **FR-103**: Deleting per-campaign configuration MUST immediately revert to global settings
- **FR-104**: System MUST warn users before deleting configuration
- **FR-105**: Changing provider MUST clear model selection (different providers have different models)
- **FR-106**: System MUST allow disconnecting account (revoke authorization) with confirmation

#### Global vs Per-Campaign Settings
- **FR-107**: Global settings MUST apply to all campaigns by default
- **FR-108**: Per-campaign settings MUST completely override global settings for that campaign
- **FR-109**: System MUST clearly indicate in Settings UI whether viewing global or per-campaign configuration
- **FR-110**: Users MUST be able to easily switch between configuring global vs per-campaign settings
- **FR-111**: Creating per-campaign settings MUST not modify global settings
- **FR-112**: System MUST show which campaigns are using global vs per-campaign settings

### Key Entities

- **BYOLLM Configuration**: Settings entity storing user's LLM provider account connection. Contains provider type (OpenAI, Anthropic, Custom), authentication method (OAuth token or API key), selected model, scope (global or per-campaign), custom system prompts for Import/Planning AI, MCP settings (hidden automatic configuration). Stored locally with basic encryption, never transmitted to VVD-mimic.

- **Account Connection**: Authenticated link to user's LLM provider account. Established via OAuth 2.0 flow or manual API key entry. Includes authorization scopes (read credits, make API calls), account info (organization name, credits remaining), and token/key storage. Validates periodically and prompts re-authorization if expired.

- **LLM Provider**: One of the supported API providers. Types: OpenAI (OAuth), Anthropic (OAuth or API key), Custom Endpoint (local LLMs). Each provider has OAuth endpoints, API base URLs, available models, authentication methods. Presented neutrally without recommendations.

- **OAuth Flow**: Authentication process redirecting user to provider's authorization page. Requests necessary scopes, handles user authorization or denial, receives callback with authorization token, stores token locally with encryption. Used by OpenAI and Anthropic providers.

- **API Key Alternative**: Manual credential entry method for Anthropic provider. User enters API key from console.anthropic.com, system validates format, stores with encryption. Includes link to provider billing page for obtaining key.

- **Credits Display**: UI component showing user's remaining API credits/usage. Fetched from provider account via API, refreshed when Settings opened, warns when credits low. Prevents surprise costs by making usage visible.

- **Model Selection**: Chosen LLM model for Import/Planning workflows. Contains model name, context window size, provider association. Model list either manually coded for prototype or auto-fetched from provider API. Stored with configuration.

- **Custom Endpoint**: Configuration for local LLM services. Contains base URL (e.g., http://localhost:11434 for Ollama), model name, authentication method (key, bearer, none). Enables offline LLM usage without external API.

- **Connection Test**: Validation operation that makes real API call to verify credentials work. Specifically tests bulk MCP operations (not just simple call). Returns success with model info or detailed error (invalid credentials, rate limit, network error, insufficient permissions).

- **MCP Configuration**: Automatic settings for Model Context Protocol bulk operations. Includes streaming enabled, timeout duration (60s default), retry attempts (3 default), progress tracking. Hidden from users like Notion permissions - works automatically without manual configuration.

- **Custom System Prompt**: Optional user-defined instructions added to Import AI or Planning AI behavior. Text input or file upload (.txt, .md). Examples: preserve terminology, follow formatting, prioritize entities. Stored per-configuration (global or per-campaign). Validated during connection test.

- **Configuration Scope**: Defines whether BYOLLM configuration is global (all campaigns) or per-campaign (specific campaign only). Per-campaign completely overrides global when configured. One set of credentials per scope.

- **Error Handler**: System component managing API errors. Handles blocking (no config), graceful failure (API error with manual retry), automatic rate limit retry with notification, expired credentials detection. Displays actionable messages to users.

- **Privacy Notice**: Prominent UI messaging emphasizing local-only credential storage. Reminds users credentials never transmitted to VVD-mimic, all API calls direct to chosen provider, basic encryption used (prototype level). Builds trust in BYOLLM model.

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all resolved through discussion)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (all resolved)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
