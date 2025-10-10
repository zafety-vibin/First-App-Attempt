
# Implementation Plan: Structured Category Database Foundation

**Branch**: `014-create-the-database` | **Date**: 2025-01-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-create-the-database/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Create the database foundation for 13 structured TTRPG categories with backend CRUD services and REST API endpoints. Implement information level filtering middleware with nuanced null handling, explicit foreign key connections, session prep one-way linking, and custom field definitions table. Database migration with proper indexes. NO UI implementation - API layer only. This establishes the CANON CONTEXT that AI tools query (distinct from optional Wiki Portal feature).

## Technical Context
**Language/Version**: TypeScript 5.0+ (Node.js 20 LTS)
**Primary Dependencies**: Express 4.x, Better-SQLite3, Keycloak Connect (token validation)
**Storage**: SQLite3 with JSON1 extension enabled, WAL mode
**Testing**: Vitest + Supertest (backend contract/integration tests)
**Target Platform**: Docker container, localhost deployment
**Project Type**: web (backend API only for this feature, frontend exists but not modified)
**Performance Goals**: <100ms single entity read, <500ms list queries (100 results)
**Constraints**: Atomic transactions for consistency, foreign key enforcement, information level filtering with intelligent null handling (null = freely accessible for AI to include/exclude intelligently, common_knowledge = truly known by most NPCs/entities)
**Scale/Scope**: 13 category tables, 75 functional requirements, 5x CRUD endpoints per category = 65 endpoints total

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Workflow-First Design (NON-NEGOTIABLE)**: ✅ PASS
- Provides database foundation for AI-assisted bulk import (Feature 017)
- Enables API-driven structured data transformation
- Eliminates manual database entry through structured schemas

**II. User Agency & Full Customization**: ✅ PASS
- custom_fields JSON column supports arbitrary user-defined properties
- custom_field_definitions table enables schema validation without code changes
- No hardcoded assumptions beyond universal fields

**III. Information Filtering & Access Control**: ✅ PASS
- player_knowledge field with null/common_knowledge/player_knowledge/dm_only tiers
- Middleware filtering respects information access boundaries
- Integration with Feature 004 custom information levels

**IV. Knowledge Graph Architecture**: ✅ PASS
- Databases store ALL entities comprehensively (canon context)
- Knowledge graphs remain separate, selective, user-curated (Feature 006)
- Clear distinction established in spec and data model

**V. BYOLLM & Privacy (NON-NEGOTIABLE)**: ✅ N/A
- Database layer only, no LLM integration
- Features 017/018 will use BYOLLM when writing to these tables

**VI. Local-Only & Prototype-First**: ✅ PASS
- SQLite embedded database, Docker localhost deployment
- Performance goals reasonable for prototype (<100ms reads, <500ms lists)
- Feature functionality prioritized over optimization

**VII. Transparency & User Approval**: ✅ N/A
- Database layer only, no autonomous AI operations
- Import workflows (Feature 017) will implement approval UI

**Result**: ✅ ALL CHECKS PASS - No violations, no complexity deviations

## Project Structure

### Documentation (this feature)
```
specs/014-create-the-database/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
backend/
├── src/
│   ├── models/
│   │   ├── npc.ts                    # NEW: NPC entity model
│   │   ├── location.ts               # NEW: Location entity model
│   │   ├── faction.ts                # NEW: Faction entity model
│   │   ├── sessionRecap.ts           # NEW: Session Recap entity model
│   │   ├── quest.ts                  # NEW: Quest entity model
│   │   ├── playerCharacter.ts        # NEW: Player Character entity model
│   │   ├── loreEntry.ts              # NEW: Lore Entry entity model
│   │   ├── worldRule.ts              # NEW: World Rule entity model
│   │   ├── planarForce.ts            # NEW: Planar Force entity model
│   │   ├── sessionPrep.ts            # NEW: Session Prep entity model
│   │   ├── customMechanic.ts         # NEW: Custom Mechanic entity model
│   │   ├── item.ts                   # NEW: Item entity model
│   │   ├── creature.ts               # NEW: Creature entity model
│   │   └── customFieldDefinition.ts  # NEW: Custom Field Definition entity
│   ├── services/
│   │   ├── npcService.ts             # NEW: NPC CRUD service
│   │   ├── locationService.ts        # NEW: Location CRUD service
│   │   ├── factionService.ts         # NEW: Faction CRUD service
│   │   ├── sessionRecapService.ts    # NEW: Session Recap CRUD service
│   │   ├── questService.ts           # NEW: Quest CRUD service
│   │   ├── playerCharacterService.ts # NEW: Player Character CRUD service
│   │   ├── loreEntryService.ts       # NEW: Lore Entry CRUD service
│   │   ├── worldRuleService.ts       # NEW: World Rule CRUD service
│   │   ├── planarForceService.ts     # NEW: Planar Force CRUD service
│   │   ├── sessionPrepService.ts     # NEW: Session Prep CRUD service
│   │   ├── customMechanicService.ts  # NEW: Custom Mechanic CRUD service
│   │   ├── itemService.ts            # NEW: Item CRUD service
│   │   └── creatureService.ts        # NEW: Creature CRUD service
│   ├── middleware/
│   │   └── informationFilter.ts      # NEW: Information level filtering middleware
│   ├── routes/
│   │   ├── npcs.ts                   # NEW: NPC REST endpoints
│   │   ├── locations.ts              # NEW: Location REST endpoints
│   │   ├── factions.ts               # NEW: Faction REST endpoints
│   │   ├── sessionRecaps.ts          # NEW: Session Recap REST endpoints
│   │   ├── quests.ts                 # NEW: Quest REST endpoints
│   │   ├── playerCharacters.ts       # NEW: Player Character REST endpoints
│   │   ├── loreEntries.ts            # NEW: Lore Entry REST endpoints
│   │   ├── worldRules.ts             # NEW: World Rule REST endpoints
│   │   ├── planarForces.ts           # NEW: Planar Force REST endpoints
│   │   ├── sessionPrep.ts            # NEW: Session Prep REST endpoints
│   │   ├── customMechanics.ts        # NEW: Custom Mechanic REST endpoints
│   │   ├── items.ts                  # NEW: Item REST endpoints
│   │   └── creatures.ts              # NEW: Creature REST endpoints
│   └── db/
│       └── migrations/
│           └── 014-category-tables.sql  # NEW: Database migration for 13 tables
└── tests/
    ├── contract/
    │   ├── npcs.test.ts              # NEW: NPC contract tests
    │   ├── locations.test.ts         # NEW: Location contract tests
    │   ├── factions.test.ts          # NEW: Faction contract tests
    │   └── [11 more category test files]
    ├── integration/
    │   ├── informationFiltering.test.ts  # NEW: Information level filtering integration test
    │   ├── foreignKeyConnections.test.ts # NEW: Explicit connections integration test
    │   └── sessionPrepOneWay.test.ts     # NEW: Session prep one-way linking integration test
    └── unit/
        └── informationFilter.test.ts      # NEW: Middleware unit test
```

**Structure Decision**: Web application structure (backend only for this feature). Frontend exists but not modified. All new files in backend/ directory. Frontend integration occurs in Feature 015 (Dashboard UI)

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - ✅ 2025-01-10
- [x] Phase 1: Design complete (/plan command) - ✅ 2025-01-10
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - ✅ 2025-01-10
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS - ✅ All 7 principles validated
- [x] Post-Design Constitution Check: PASS - ✅ No violations introduced
- [x] All NEEDS CLARIFICATION resolved - ✅ No unknowns remain
- [x] Complexity deviations documented - ✅ No deviations (Complexity Tracking table empty)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
