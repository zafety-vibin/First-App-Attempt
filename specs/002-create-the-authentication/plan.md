# Implementation Plan: Authentication Flow & Campaign Management (Local Prototype)

**Branch**: `002-create-the-authentication` | **Date**: 2025-10-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-create-the-authentication/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✓
2. Fill Technical Context ✓ (LOCAL PROTOTYPE)
3. Fill Constitution Check ✓
4. Evaluate Constitution Check → PASS ✓
5. Execute Phase 0 → research.md ✓ COMPLETE
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md ✓ COMPLETE
7. Re-evaluate Constitution Check ✓ PASS (no new violations)
8. Plan Phase 2 → Task generation approach ✓ COMPLETE
9. STOP - Ready for /tasks command ✓
```

## Summary

**Primary Requirement**: Implement three-page authentication flow (public landing → login → campaign management → campaign homepage/wiki) with Keycloak integration running entirely on localhost via Docker, supporting multiple campaigns per user and seamless transition between editing and AI tools.

**Technical Approach**: Fully local Docker Compose deployment with three services: (1) Keycloak container for auth, (2) Node.js/Express backend API with SQLite database, (3) React frontend. All services communicate on Docker network. SQLite file persists in mounted volume. Only external connection: BYOLLM API calls to OpenAI/Anthropic (spec 008). Campaign homepage IS the wiki (renders card architecture from spec 003).

## Technical Context

**Language/Version**:
- Frontend: React 18+ with TypeScript 5.0+
- Backend: Node.js 20 LTS with TypeScript 5.0+
- Infrastructure: Docker Compose 2.x

**Primary Dependencies**:
- Frontend: React Router v6, Keycloak-js, Axios, Vite (dev server)
- Backend: Express 4.x, Keycloak Connect, Better-SQLite3, CORS
- Infrastructure: Keycloak official image (Quay.io)

**Storage**:
- SQLite3 file in Docker volume (./data/vvd-mimic.db)
- Persists across container restarts
- Single-user, no locking concerns

**Testing**:
- Frontend: Vitest + React Testing Library + Playwright (E2E)
- Backend: Vitest + Supertest (API contract tests)
- Integration: Docker Compose test environment

**Target Platform**:
- **localhost ONLY** (127.0.0.1)
- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Browser: Chrome/Firefox/Edge (latest)

**Project Type**: Web (frontend + backend + auth service in Docker)

**Performance Goals**:
- Docker Compose startup <30s (cold start with image pulls)
- Page loads <2s (all localhost, no network latency)
- Authentication flow <3s (Keycloak same machine)
- Campaign operations <500ms (SQLite in-memory performance)

**Constraints**:
- **LOCAL ONLY**: No remote access (localhost:3000)
- **Single-user**: One GM, no multi-tenancy
- **Docker required**: All services in containers
- **No external hosting**: Everything runs on developer machine
- **Keycloak configuration**: Realm + client setup on first run
- **SQLite limitations**: No concurrent writers (acceptable for single-user)
- **Only external calls**: BYOLLM APIs (OpenAI/Anthropic per spec 008)

**Scale/Scope**:
- 1 user (GM) on localhost
- Up to 100 campaigns (SQLite handles easily)
- 3 Docker services (keycloak, backend, frontend)
- Foundation for all 9 features working in orchestra

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Workflow-First Design ✓ PASS
- Local deployment removes hosting friction
- Campaign creation minimal (just name)
- No "plan twice" - campaign homepage = wiki directly
- Docker orchestration makes services work together seamlessly

### II. User Agency & Full Customization ✓ PASS
- Local deployment = user owns ALL data on their machine
- Campaign homepage fully customizable (spec 003 card architecture)
- SQLite file can be backed up/restored by user
- No vendor lock-in

### III. Information Filtering & Access Control ✓ PASS
- Public URLs work on localhost (http://localhost:3000/public/:campaignId)
- GM View vs Player View distinction for future local network sharing
- Foundation for DM Secret filtering (spec 004)

### IV. Knowledge Graph Architecture ✓ PASS
- Campaign entity will reference graphs (spec 006)
- SQLite supports graph-like relationships via foreign keys
- Local storage enables complex graph queries without latency

### V. BYOLLM & Privacy ✓ PASS
- No LLM in auth feature
- User entity includes BYOLLM config column (spec 008)
- **Local deployment = maximum privacy** (data never leaves machine)
- Only external calls: BYOLLM APIs with user's credentials

### VI. Local-Only & Prototype-First ✓ PASS
- **PERFECT ALIGNMENT**: This IS the local prototype per constitution
- Docker Compose handles complexity
- SQLite embedded = no database server needed
- Single-user = no auth complexity beyond Keycloak
- Focus on features working, not production concerns

### VII. Transparency & User Approval ✓ PASS
- No AI in auth feature
- Campaign delete requires confirmation
- User explicitly creates campaigns
- Local deployment = user sees all logs/data

**Result**: ✓ PASS - Perfect constitutional alignment for local prototype

## Project Structure

### Docker Compose Architecture
```
vvd-mimic/                    # Repository root
├── docker-compose.yml        # Orchestrates all services
├── .env                      # Local config (Keycloak secrets, ports)
├── data/                     # Mounted volume for persistence
│   └── vvd-mimic.db         # SQLite database file
├── keycloak/                 # Keycloak configuration
│   ├── Dockerfile.keycloak  # Custom Keycloak setup
│   └── realm-export.json    # Pre-configured realm
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
```

### Documentation (this feature)
```
specs/002-create-the-authentication/
├── plan.md              # This file
├── research.md          # Phase 0: Docker + Keycloak research
├── data-model.md        # Phase 1: Entities (User, Campaign, Session)
├── quickstart.md        # Phase 1: docker-compose up instructions
├── contracts/           # Phase 1: API contracts
│   ├── auth.yaml       # Keycloak OAuth flow
│   ├── campaigns.yaml  # Campaign CRUD
│   └── sessions.yaml   # Session management
└── tasks.md             # Phase 2: Implementation tasks (/tasks command)
```

### Backend Service (Node.js API)
```
backend/
├── Dockerfile                # Node 20 + dependencies
├── package.json
├── tsconfig.json
├── src/
│   ├── models/
│   │   ├── User.ts           # user_id (Keycloak sub), created_at, byollm_config
│   │   ├── Campaign.ts       # id, name, owner_id FK, public_url_id, created_at, updated_at
│   │   └── Session.ts        # session_id, user_id FK, token, expires_at
│   ├── services/
│   │   ├── AuthService.ts    # Keycloak token validation
│   │   ├── CampaignService.ts # CRUD, ownership checks
│   │   ├── SessionService.ts  # Session lifecycle
│   │   └── DatabaseService.ts # SQLite connection + migrations
│   ├── middleware/
│   │   ├── keycloak.ts       # Token verification middleware
│   │   ├── errorHandler.ts   # Centralized error responses
│   │   └── cors.ts           # CORS for localhost:3000
│   ├── routes/
│   │   ├── auth.ts           # POST /auth/login, /auth/logout, GET /auth/validate
│   │   ├── campaigns.ts      # GET /campaigns, POST /campaigns, DELETE /campaigns/:id
│   │   └── health.ts         # GET /health (Docker healthcheck)
│   ├── db/
│   │   ├── schema.sql        # CREATE TABLE statements
│   │   ├── migrations.ts     # Version tracking
│   │   └── seed.ts           # Initial data (default campaign template)
│   └── server.ts             # Express setup, middleware registration
├── tests/
│   ├── contract/
│   │   ├── auth.contract.test.ts
│   │   └── campaigns.contract.test.ts
│   ├── integration/
│   │   └── auth-flow.integration.test.ts
│   └── unit/
│       └── services/
│           ├── AuthService.test.ts
│           └── CampaignService.test.ts
└── jest.config.js
```

### Frontend Service (React SPA)
```
frontend/
├── Dockerfile                # Node 20 + Vite
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── src/
│   ├── App.tsx               # Root component with AuthProvider
│   ├── main.tsx              # React mount point
│   ├── components/
│   │   ├── PublicLanding.tsx     # Marketing page with login button (top-left)
│   │   ├── CampaignManagement.tsx # List/Create/Delete campaigns
│   │   ├── CampaignHomepage.tsx   # Wiki view (renders cards from spec 003)
│   │   └── shared/
│   │       ├── LoginButton.tsx    # Triggers Keycloak OAuth
│   │       ├── LogoutButton.tsx   # Clears session
│   │       ├── NavBar.tsx         # Navigation with campaign name
│   │       └── ProtectedRoute.tsx # Route guard (redirects to / if not authed)
│   ├── pages/
│   │   ├── LandingPage.tsx       # Route: /
│   │   ├── CampaignsPage.tsx     # Route: /campaigns
│   │   ├── CampaignPage.tsx      # Route: /campaigns/:id
│   │   └── NotFoundPage.tsx      # Route: *
│   ├── services/
│   │   ├── keycloakService.ts    # Keycloak-js initialization
│   │   ├── apiClient.ts          # Axios instance with token injection
│   │   └── campaignService.ts    # API calls: getCampaigns, createCampaign, deleteCampaign
│   ├── hooks/
│   │   ├── useAuth.ts            # Returns {user, isAuthenticated, login, logout}
│   │   ├── useCampaigns.ts       # Returns {campaigns, loading, createCampaign, deleteCampaign}
│   │   └── useKeycloak.ts        # Wraps keycloak-js instance
│   ├── contexts/
│   │   └── AuthContext.tsx       # Global: Keycloak state, user info
│   ├── routes/
│   │   └── AppRoutes.tsx         # React Router config
│   ├── types/
│   │   ├── User.ts
│   │   ├── Campaign.ts
│   │   └── Auth.ts
│   └── config/
│       └── keycloak.ts           # Keycloak client config (localhost:8080)
├── tests/
│   ├── components/
│   │   ├── PublicLanding.test.tsx
│   │   └── CampaignManagement.test.tsx
│   └── e2e/
│       └── auth-flow.spec.ts     # Playwright: login → create campaign → view homepage
└── vitest.config.ts
```

### Keycloak Configuration
```
keycloak/
├── Dockerfile.keycloak          # FROM quay.io/keycloak/keycloak:latest
├── realm-export.json            # VVD-mimic realm pre-configured
│                                # - Client ID: vvd-mimic-frontend
│                                # - Redirect URIs: http://localhost:3000/*
│                                # - Web Origins: http://localhost:3000
│                                # - Client authentication: OFF (public client)
│                                # - Standard flow: ENABLED
│                                # - Admin user: admin/admin (dev only)
└── import-realm.sh              # Script to import realm on first run
```

### Shared Types (used by both frontend & backend)
```
shared/
└── types/
    ├── User.ts
    │   export interface User {
    │     id: string;              // Keycloak sub
    │     username: string;
    │     email: string;
    │     createdAt: Date;
    │     byollmConfig?: object;   // For spec 008
    │   }
    ├── Campaign.ts
    │   export interface Campaign {
    │     id: string;
    │     name: string;
    │     ownerId: string;         // FK to User
    │     publicUrlId: string;     // Random ID for public access
    │     createdAt: Date;
    │     updatedAt: Date;
    │   }
    └── Session.ts
        export interface Session {
          sessionId: string;
          userId: string;
          token: string;
          expiresAt: Date;
        }
```

### Docker Compose Services
```yaml
# docker-compose.yml
version: '3.9'

services:
  keycloak:
    build:
      context: ./keycloak
      dockerfile: Dockerfile.keycloak
    container_name: vvd-keycloak
    ports:
      - "8080:8080"
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
      KC_DB: dev-file  # Embedded H2 database (prototype)
    volumes:
      - keycloak-data:/opt/keycloak/data
    networks:
      - vvd-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health/ready"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: vvd-backend
    ports:
      - "3001:3001"
    environment:
      PORT: 3001
      NODE_ENV: development
      DATABASE_PATH: /app/data/vvd-mimic.db
      KEYCLOAK_URL: http://keycloak:8080
      KEYCLOAK_REALM: vvd-mimic
      KEYCLOAK_CLIENT_ID: vvd-mimic-backend
      CORS_ORIGIN: http://localhost:3000
    volumes:
      - ./data:/app/data          # SQLite persistence
      - ./backend/src:/app/src    # Hot reload in dev
    depends_on:
      keycloak:
        condition: service_healthy
    networks:
      - vvd-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: vvd-frontend
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:3001
      VITE_KEYCLOAK_URL: http://localhost:8080
      VITE_KEYCLOAK_REALM: vvd-mimic
      VITE_KEYCLOAK_CLIENT_ID: vvd-mimic-frontend
    volumes:
      - ./frontend/src:/app/src   # Hot reload in dev
    depends_on:
      - backend
    networks:
      - vvd-network

volumes:
  keycloak-data:    # Persists Keycloak realm data

networks:
  vvd-network:
    driver: bridge
```

**Structure Decision**: Docker Compose architecture selected because:
1. **Local-only requirement**: Everything on localhost, no deployment complexity
2. **Service orchestration**: Keycloak, backend, frontend work together automatically
3. **Data persistence**: Mounted volumes for SQLite and Keycloak data
4. **Development efficiency**: Hot reload via volume mounts
5. **Constitutional alignment**: Perfect for prototype phase (Constitution VI)
6. **Network isolation**: All services communicate via Docker network
7. **One command start**: `docker-compose up` runs entire application
8. **Healthchecks**: Services wait for dependencies before starting

## Phase 0: Outline & Research

### Critical Research Areas

1. **Keycloak Docker Setup & Realm Configuration**
   - Task: Research Keycloak container initialization with pre-configured realm
   - Focus: realm-export.json format, import on startup, client configuration for OAuth 2.0 Authorization Code Flow
   - Why critical: Keycloak misconfiguration blocks entire auth flow

2. **Docker Compose Service Dependencies & Health Checks**
   - Task: Research proper health check configuration and startup ordering
   - Focus: depends_on with condition: service_healthy, retry strategies, network configuration
   - Why critical: Services must start in correct order (Keycloak → Backend → Frontend)

3. **SQLite with Docker Volumes**
   - Task: Research SQLite file persistence in Docker volumes with proper permissions
   - Focus: Volume mount paths, file ownership (node user), WAL mode for better concurrency
   - Why critical: Data loss if volume configuration incorrect

4. **Keycloak-js OAuth Flow in React**
   - Task: Research keycloak-js initialization and protected route patterns
   - Focus: Silent token refresh, logout handling, storing tokens securely
   - Why critical: Core authentication UX depends on this

5. **Keycloak Connect Middleware for Express**
   - Task: Research keycloak-connect token validation and session management
   - Focus: Token introspection, role-based access (future), error handling
   - Why critical: Backend API security depends on proper token validation

6. **CORS Configuration for Docker Services**
   - Task: Research CORS setup for localhost:3000 (frontend) → localhost:3001 (backend)
   - Focus: Credentials: true, allowed origins, preflight requests
   - Why critical: Frontend API calls fail without correct CORS

7. **Public URL Generation for Campaigns**
   - Task: Research secure random ID generation (crypto.randomBytes) and collision prevention
   - Focus: ID length, URL-safe encoding, uniqueness checks
   - Why critical: Public campaign URLs must be unguessable

8. **Docker Hot Reload for Development**
   - Task: Research volume mount strategies for hot reload in both React (Vite) and Node.js
   - Focus: nodemon for backend, Vite HMR for frontend, avoiding node_modules mounts
   - Why critical: Fast iteration speed during development

### Research Output Structure

**Creating research.md with 8 sections:**
- Each section: Decision, Rationale, Implementation approach, Pitfalls to avoid
- Code examples for critical configurations
- Links to official documentation
- Security considerations (especially Keycloak + CORS)

**Status**: ✓ Complete - See [research.md](./research.md)

**Key Decisions Made**:
- Keycloak official Docker image with realm-export.json pre-configuration
- Better-SQLite3 with WAL mode in Docker bind mount
- keycloak-js (frontend) + keycloak-connect (backend) for OAuth 2.0
- crypto.randomBytes for secure public URL generation (16 chars, base64url)
- Nodemon + Vite HMR for development hot reload

---

## Phase 1: Design & Contracts

*Prerequisites: research.md complete ✓*

**Status**: ✓ COMPLETE

### Deliverables Created

1. **data-model.md** ✓ - Three core entities (User, Campaign, Session) with SQLite schema, relationships, lifecycle documentation, and TypeScript interfaces

2. **API Contracts** ✓ - OpenAPI 3.0 specifications:
   - contracts/auth.yaml (login, logout, validate, refresh)
   - campaigns.yaml (CRUD + public URL access)
   - contracts/sessions.yaml (session management)

3. **quickstart.md** ✓ - Complete setup guide with user flow testing, API examples, troubleshooting, and success criteria

4. **CLAUDE.md** ✓ - Development guidelines with technologies, structure, commands, code style, and constitutional principles

### Constitution Check Re-evaluation

All Phase 1 design decisions evaluated against 7 constitutional principles:

✅ **I-VII**: All principles maintain PASS status - No new violations introduced by data model, API contracts, or infrastructure design. Docker + SQLite + Keycloak architecture fully supports workflow-first design, user agency, privacy, and local-only deployment.

**Result**: ✓ PASS - Design maintains perfect constitutional alignment

---

## Phase 2: Task Planning Approach

*IMPORTANT: This section describes what the /tasks command will do. DO NOT execute during /plan.*

### Task Generation Strategy

The /tasks command will generate ~35-40 ordered tasks using TDD approach (tests before implementation) with dependency tracking and parallelization markers [P].

### Task Categories

**Infrastructure** (8 tasks): Docker Compose, Keycloak realm, database schema, environment configuration

**Backend** (16 tasks): Models, services, routes, middleware, contract tests

**Frontend** (12 tasks): Components, pages, hooks, routing, integration with Keycloak

**Integration** (3 tasks): Auth flow E2E, public URL tests, quickstart verification

### Dependency Ordering

**Phase A**: Infrastructure (sequential) → **Phase B**: Backend foundation [parallel] → **Phase C**: Services [parallel] → **Phase D**: Routes [parallel] → **Phase E**: Frontend foundation [parallel] → **Phase F**: Pages [parallel] → **Phase G**: Integration (sequential)

### Estimated Output

tasks.md with ~35-40 numbered tasks, each with:
- Clear description
- Acceptance criteria
- Dependency requirements
- [P] marker if parallelizable
- TDD ordering (contract tests before implementations)

---

**Status**: ✓ Phase 0 & 1 Complete - Ready for /tasks command

**Next Step**: Run `/tasks` to generate tasks.md with implementation plan
