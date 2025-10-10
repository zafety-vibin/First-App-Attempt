# Feature 018: External API for Conversational Database Operations - Technical Decisions

## 1. MCP SDK Integration Strategy

**Decision**: Implement a plain REST API on port 3002 without MCP SDK integration. The API will be MCP-compatible but not MCP-dependent.

**Rationale**: External AI tools like Claude Desktop already have their own MCP client implementations. They need a standard REST endpoint to connect to, not another MCP server. This approach allows any AI tool (MCP-enabled or not) to access the API.

**Alternatives Considered**:
- Full MCP server implementation: Would create unnecessary complexity and duplicate Feature 011's MCP server
- Hybrid MCP/REST: Would split concerns and make testing harder

## 2. REST API Design for Conversational Workflows

**Decision**: Implement stateless REST endpoints with conversation context passed in request body. Structure: `/api/v1/campaigns/{campaignId}/database/{category}` with standard CRUD operations (GET, POST, PUT, DELETE).

**Rationale**: Stateless design allows multiple AI tools to interact simultaneously without session conflicts. Category-based routing matches Feature 014's database structure. Conversation context in request body enables tools to maintain their own state.

**Alternatives Considered**:
- Session-based API with context storage: Would require session management complexity
- GraphQL API: Overkill for testing purposes, adds learning curve

## 3. Winston Logging Configuration

**Decision**: Use winston with JSON format, daily rotate files, and structured logging fields: {timestamp, level, api_endpoint, method, campaign_id, category, operation_type, user_agent, response_time_ms, error}.

**Rationale**: JSON format enables easy parsing for analysis. Daily rotation prevents disk bloat during testing. Structured fields allow filtering by campaign, category, or operation type for workflow comparison.

**Alternatives Considered**:
- Console logging only: Insufficient for audit trail requirements
- Database logging: Would mix concerns and impact performance

## 4. Audit Trail Design

**Decision**: Create api_requests table with: id, campaign_id, category, operation, request_body (JSON), response_status, response_body (JSON), user_agent, ip_address, duration_ms, created_at. Implement 30-day retention for testing data.

**Rationale**: Captures full request/response for workflow analysis. JSON columns allow flexible querying. 30-day retention balances testing needs with storage. Separate from application logs for clean separation.

**Alternatives Considered**:
- Log files only: Harder to query for analytics
- Event sourcing pattern: Overcomplicated for testing API

## 5. Claude Desktop Integration

**Decision**: Configure CORS with origin: ['http://localhost:*', 'http://127.0.0.1:*'] and credentials: false. No authentication required for localhost. Implement /health endpoint for connection verification.

**Rationale**: Localhost-only access provides implicit security for testing. Wildcard ports allow flexibility for AI tool configurations. Health endpoint enables tools to verify connection before operations.

**Alternatives Considered**:
- API key authentication: Unnecessary complexity for localhost testing
- IP whitelist: Redundant with localhost binding

## 6. Confirmation Workflow for Destructive Operations

**Decision**: Implement two-phase confirmation: DELETE requests return confirmation object with affected_count and preview of items. Actual deletion requires DELETE with ?confirm=true query parameter within 60 seconds.

**Rationale**: Prevents accidental deletions in conversational flow. Preview allows AI to communicate impact to user. Time limit prevents stale confirmations. Query parameter approach is REST-compliant.

**Alternatives Considered**:
- Separate /confirm endpoint: Breaks REST semantics
- Soft deletes only: Doesn't match Feature 014's hard delete pattern

## 7. Campaign Ownership & Information Level Filtering

**Decision**: Reuse ViewModeService from Feature 004 with X-View-Mode header support. Campaign ownership validated via campaign_id in URL. Information level filtering applied to all query responses.

**Rationale**: Maintains consistency with main application. External tools can specify view mode for testing different perspectives. Leverages existing, tested middleware patterns.

**Alternatives Considered**:
- Bypass filtering for testing: Would give unrealistic results
- Simplified filtering: Would diverge from production behavior

## 8. Error Handling for Conversational Context

**Decision**: Return structured errors: {error: {code: string, message: string, details: object, suggestion: string}}. Include specific codes like VALIDATION_ERROR, NOT_FOUND, PERMISSION_DENIED with AI-friendly suggestions.

**Rationale**: Structured format helps AI tools parse and respond appropriately. Suggestions guide corrective actions. Consistent with Feature 008's error patterns but enhanced for AI interpretation.

**Alternatives Considered**:
- Simple string errors: Insufficient for AI parsing
- HTTP status codes only: Lacks detail for conversational recovery

## 9. Performance Optimization for Query Operations

**Decision**: Implement query builders with index hints, LIMIT default of 100, and cursor-based pagination. Use prepared statements from Better-SQLite3. Cache category schemas in memory on startup.

**Rationale**: Index hints ensure <100ms single queries. Cursor pagination handles large result sets efficiently. Schema caching eliminates repeated JSON parsing. Aligns with Feature 014's performance targets.

**Alternatives Considered**:
- Offset pagination: Performance degrades with large offsets
- No pagination: Risk of memory issues with large categories

## 10. Testing Strategy for Conversational Workflows

**Decision**: Create conversation scenario tests simulating multi-turn AI interactions. Use Supertest for contract tests. Implement test fixtures with pre-populated category data. Compare metrics against Feature 017 baseline.

**Rationale**: Scenario tests validate end-to-end workflows. Contract tests ensure API compatibility. Fixtures provide consistent test data. Comparison metrics justify conversational vs stateless approach.

**Alternatives Considered**:
- Mock AI tool tests: Wouldn't reflect real integration behavior
- Production data testing: Privacy concerns and inconsistent baselines