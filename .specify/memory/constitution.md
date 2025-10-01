<!--
Sync Impact Report:
- Version: 1.0.0 → 1.1.0 (MINOR)
- Refined constitution to focus on principles over feature specifications
- Clarified knowledge graph optionality (World-Foundations default but not enforced)
- Added clearer mission statement emphasizing DM database problem
- Removed feature implementation details (moved to future specs)
- Templates requiring updates:
  ✅ plan-template.md - Constitution Check section will reference these principles
  ✅ spec-template.md - Aligned with user-centric and workflow principles
  ✅ tasks-template.md - Reflects prototype-first and feature-driven development
- Follow-up TODOs: None
-->

# VVD-mimic Constitution

## Mission

VVD-mimic provides Game Masters with a campaign database and management tool that solves the "plan twice" problem. Game Masters already maintain detailed notes in documents; this system eliminates the tedious manual rewrite into a structured database through AI-assisted workflow improvements while providing the organizational benefits of a VVD-style wiki and database.

## Core Principles

### I. Workflow-First Design (NON-NEGOTIABLE)
Users MUST NOT have to "plan twice" - maintaining notes in external tools and then manually re-entering them into the application is unacceptable. The system MUST provide AI-assisted bulk import and transformation of existing notes.

**Rationale**: The core problem VVD-mimic solves is eliminating the tedious rewrite workflow (Google Docs → manual database entry). Every feature must respect this principle or it undermines the project's primary value proposition.

**Implementation Requirements**:
- MCP integration for bulk API-driven changes
- AI-powered note parsing and structured data extraction
- User approval required for all AI-suggested changes (transparency & control)
- Fast, responsive note-adding experience (seconds matter at scale)

### II. User Agency & Full Customization
Users MUST have complete control over their data structure, page layouts, and information architecture. The system provides sensible TTRPG defaults but MUST NOT restrict customization.

**Rationale**: VVD.sh's fixed structure limits creativity. Our users need flexibility to track any property (e.g., NPC sexuality, custom factions, non-standard attributes) and design their wiki layout how they want.

**Implementation Requirements**:
- Custom database fields/properties without code changes
- Notion-inspired page layout editor with full user control
- User-editable information filtering rules
- No hardcoded assumptions about TTRPG structure beyond starter templates

### III. Information Filtering & Access Control
The system MUST implement a tiered information visibility system that respects the boundary between player knowledge and GM secrets.

**Rationale**: TTRPGs require secret information management. Unlike VVD.sh, we make this a first-class feature enabling player-facing functionality without spoiling secrets.

**Implementation Requirements**:
- Default tiers: Common Knowledge, Player Knowledge, DM Secret, with custom tiers allowed
- Visual censorship (black bars) showing hidden content exists
- Dynamic tier promotion (Secrets → Player Knowledge as discovered)
- Per-content-item tier assignment with bulk editing support
- Tier-scoped queries for AI interactions

### IV. Knowledge Graph Architecture
The system MUST support specialized knowledge graphs to provide AI with contextual understanding of the campaign world beyond flat database queries.

**Rationale**: Static database queries are insufficient for AI generation. Knowledge graphs enable AI to understand relationships, context, and narrative causality. This differentiates AI-assisted generation from generic LLM responses.

**Graph Capabilities**:
- **Geographical**: Location hierarchies and spatial relationships
- **Political-Web**: NPC/PC/faction relationships and power dynamics
- **World-Foundations**: Core setting differentiators, magic systems, world quirks (created by default on campaign initialization)
- **Campaign-Story**: Timeline, events, and cause-and-effect narrative tracking

**Implementation Requirements**:
- All graphs optional for any AI query (user controls context)
- World-Foundations graph created by default but can be disabled per-query
- User-visible graph visualization and editing capabilities
- Relationship inference suggestions require user approval

### V. BYOLLM & Privacy (NON-NEGOTIABLE)
Users MUST provide their own LLM API credentials. The system MUST NOT provide, subsidize, or be liable for LLM usage costs or content.

**Rationale**: Local-only prototype with no monetization path. Users control their AI provider choice and costs.

**Implementation Requirements**:
- Support multiple providers: OpenAI, Anthropic, local models (Ollama), etc.
- Clear credential configuration UI at setup
- No LLM calls without explicit user API keys
- No logging or storage of LLM provider credentials beyond local config
- Graceful degradation if LLM unavailable (disable AI features, preserve core functionality)

### VI. Local-Only & Prototype-First
This is a local development prototype. Feature functionality takes absolute priority over performance optimization, scalability, or production-readiness.

**Rationale**: Proving the workflow concept is critical before investing in optimization. Single-user local deployment has different constraints than cloud SaaS.

**Implementation Requirements**:
- Single-user architecture (no multi-tenancy complexity)
- File-based or embedded database acceptable (SQLite, etc.)
- Defer performance optimization until features work
- No need for authentication/authorization beyond basic login
- Acceptable to have load times measured in seconds during prototype phase
- Focus on getting AI integrations working correctly over speed

### VII. Transparency & User Approval
AI MUST NOT autonomously change user content. All AI-generated suggestions, imports, and transformations MUST be reviewable and require explicit user approval.

**Rationale**: Users must maintain ownership and trust in their campaign data. AI is an assistant, not an autonomous agent.

**Implementation Requirements**:
- Preview mode for all AI-generated content before saving
- Diff view for AI-suggested changes to existing content
- Batch approval UI for bulk operations
- Ability to edit AI suggestions before accepting
- Clear indication of AI-generated vs user-created content
- Undo/rollback for AI-assisted operations

## AI Integration Principles

### Context Control
Users MUST have granular control over what context the AI receives for any query or generation task.

**Rationale**: Generic LLM responses are insufficient for campaign-specific generation. Users need to learn and control context engineering to receive in-world, setting-appropriate responses.

**Requirements**:
- Selective activation/deactivation of knowledge graphs per query
- Clear indication of what context is being provided to AI
- Educational guidance on context engineering for better results
- Templates and examples for common query patterns

### Player-Facing AI
The system MUST support AI interactions that respect information access tiers, enabling player-facing features without spoiling secrets.

**Requirements**:
- AI queries can be scoped to specific access tiers (e.g., "Common Knowledge only")
- Players never receive responses containing DM Secret information
- GM visibility into player AI interactions
- Clear boundaries between player-accessible and GM-only AI features

## Technical Architecture Constraints

### Data Storage
- Embedded database (SQLite) or file-based acceptable for prototype
- Full-text search required for wiki functionality
- Graph database or graph-like relationships for knowledge graphs
- Schema flexibility for custom user properties

### API Design
- REST or GraphQL for MCP integration
- Bulk operation endpoints for AI-assisted imports
- Versioning for rollback support
- Rate limiting not required (local single-user)

### Frontend
- Notion-inspired block-based editor
- Drag-and-drop page layout customization
- Real-time preview (local = low latency acceptable)
- Markdown support with wiki-style links

## Governance

### Amendment Process
1. Proposed changes documented in PR or issue
2. Rationale for change must reference user need or technical blocker
3. Impact assessment on existing principles
4. Version bump following semantic versioning

### Versioning Policy
- **MAJOR**: Principle removal, redefinition, or backward-incompatible governance change
- **MINOR**: New principle added or material expansion of existing principle
- **PATCH**: Clarifications, wording improvements, non-semantic refinements

### Compliance Review
- All feature specs MUST pass Constitution Check in plan.md
- Violations require documented justification in Complexity Tracking section
- Unjustifiable violations block implementation until simplified
- Post-design Constitution Check required after Phase 1 in planning process

### Development Guidance
- This constitution supersedes all other development practices
- When constitution conflicts with external patterns/best practices, constitution wins
- Complexity must be justified or eliminated
- Features that don't serve user workflow improvement should be questioned

**Version**: 1.1.0 | **Ratified**: 2025-10-01 | **Last Amended**: 2025-10-01
