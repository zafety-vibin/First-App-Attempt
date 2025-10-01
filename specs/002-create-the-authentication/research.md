# Research: Authentication Flow & Campaign Management (Local Prototype)

**Feature**: 002-create-the-authentication
**Phase**: 0 (Research & Technical Decisions)
**Date**: 2025-10-01
**Context**: Fully local Docker Compose deployment on localhost

---

## 1. Keycloak Docker Setup & Realm Configuration

### Decision
Use official Keycloak Docker image (quay.io/keycloak/keycloak:latest) with pre-configured realm imported via realm-export.json on container initialization.

### Rationale
- **Official support**: Quay.io image is Keycloak's official distribution, receives security updates
- **Dev-file database**: Keycloak's embedded H2 database perfect for local prototype (no separate DB container needed)
- **Realm import**: Pre-configured realm eliminates manual setup on every `docker-compose up`
- **OAuth 2.0 Authorization Code Flow**: Industry standard for web applications, supported natively by Keycloak
- **Constitutional alignment**: Prototype-first (Constitution VI) - embedded H2 acceptable, can upgrade to PostgreSQL later

### Implementation Approach

**Dockerfile.keycloak**:
```dockerfile
FROM quay.io/keycloak/keycloak:latest

# Copy realm configuration
COPY realm-export.json /opt/keycloak/data/import/vvd-mimic-realm.json

# Set Keycloak to development mode with realm import
ENV KC_DB=dev-file
ENV KEYCLOAK_ADMIN=admin
ENV KEYCLOAK_ADMIN_PASSWORD=admin

# Start Keycloak with import
ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start-dev", "--import-realm"]
```

**realm-export.json structure**:
```json
{
  "realm": "vvd-mimic",
  "enabled": true,
  "clients": [
    {
      "clientId": "vvd-mimic-frontend",
      "enabled": true,
      "publicClient": true,
      "redirectUris": ["http://localhost:3000/*"],
      "webOrigins": ["http://localhost:3000"],
      "standardFlowEnabled": true,
      "implicitFlowEnabled": false,
      "directAccessGrantsEnabled": false,
      "protocol": "openid-connect"
    },
    {
      "clientId": "vvd-mimic-backend",
      "enabled": true,
      "publicClient": false,
      "bearerOnly": true,
      "protocol": "openid-connect"
    }
  ],
  "users": [
    {
      "username": "testuser",
      "enabled": true,
      "email": "test@localhost",
      "credentials": [
        {
          "type": "password",
          "value": "password"
        }
      ]
    }
  ]
}
```

**docker-compose.yml service**:
```yaml
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
    KC_DB: dev-file
  volumes:
    - keycloak-data:/opt/keycloak/data
  networks:
    - vvd-network
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8080/health/ready"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### Pitfalls to Avoid
1. **Import path confusion**: Realm file MUST be in `/opt/keycloak/data/import/` directory, not arbitrary location
2. **start-dev vs start**: Use `start-dev` for localhost (disables HTTPS requirement), use `start` for production
3. **Client type mismatch**: Frontend MUST be `publicClient: true` (no client secret), backend MUST be `bearerOnly: true` (only validates tokens)
4. **Redirect URI wildcards**: Must include `/*` suffix (`http://localhost:3000/*`) to allow all routes
5. **Realm persistence**: Without volume mount, realm data lost on container restart
6. **Health check timing**: Keycloak takes 15-30 seconds to start; health check must account for this

### Security Considerations
- **Development credentials**: `admin/admin` acceptable for localhost prototype, MUST be changed for any network-accessible deployment
- **HTTP acceptable**: localhost deployment doesn't need HTTPS (Keycloak allows HTTP in dev mode)
- **No client secret for frontend**: Public clients can't keep secrets (JavaScript in browser), rely on PKCE extension
- **Token expiration**: Set reasonable expiration (15 minutes access token, 30 days refresh token) in realm config

### References
- [Keycloak Docker Documentation](https://www.keycloak.org/server/containers)
- [Keycloak Import/Export](https://www.keycloak.org/server/importExport)
- [OAuth 2.0 Authorization Code Flow](https://oauth.net/2/grant-types/authorization-code/)
- [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/index.html)

---

## 2. Docker Compose Service Dependencies & Health Checks

### Decision
Use `depends_on` with `condition: service_healthy` to enforce startup order: Keycloak → Backend → Frontend. Each service implements custom health check endpoint.

### Rationale
- **Startup ordering**: Backend requires Keycloak for token validation, frontend requires backend API
- **Graceful failure**: Health checks prevent cascade failures (backend won't start until Keycloak ready)
- **Development efficiency**: `docker-compose up` works reliably without manual intervention
- **Retry logic**: Docker automatically retries failed health checks before marking service unhealthy

### Implementation Approach

**Service dependency chain**:
```yaml
services:
  keycloak:
    # ... (see section 1)
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health/ready"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  backend:
    # ... (build config)
    depends_on:
      keycloak:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s

  frontend:
    # ... (build config)
    depends_on:
      backend:
        condition: service_healthy
    # No healthcheck needed (Vite serves immediately)
```

**Backend health endpoint** (`backend/src/routes/health.ts`):
```typescript
import express from 'express';
import { keycloakClient } from '../services/AuthService';
import { db } from '../services/DatabaseService';

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbCheck = db.prepare('SELECT 1').get();

    // Check Keycloak connectivity
    const keycloakCheck = await fetch(
      `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`
    );

    if (keycloakCheck.ok) {
      res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
    } else {
      throw new Error('Keycloak unreachable');
    }
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

export default router;
```

### Pitfalls to Avoid
1. **start_period too short**: Keycloak needs 30s, backend needs 10s - don't set to 0 or services fail prematurely
2. **Circular dependencies**: Never create dependency cycles (frontend → backend → keycloak → frontend)
3. **Health check command unavailable**: Ensure `curl` is installed in container (`apt-get install curl` in Dockerfile)
4. **Network timing**: Services communicate via Docker network names (`http://keycloak:8080`), not localhost
5. **Incomplete health checks**: Must verify dependencies (backend health check MUST test Keycloak connectivity)
6. **Exit on failure**: If health check fails after retries, container stops - frontend won't start if backend fails

### Best Practices
- **Granular checks**: Health endpoint tests all critical dependencies (database, Keycloak, config)
- **Timeout consistency**: Use same timeout (5s) across services for predictable behavior
- **Logging**: Health check failures should log detailed error for debugging
- **Graceful degradation**: Consider returning 503 (Service Unavailable) instead of crashing

### References
- [Docker Compose depends_on](https://docs.docker.com/compose/compose-file/compose-file-v3/#depends_on)
- [Docker Healthcheck](https://docs.docker.com/engine/reference/builder/#healthcheck)
- [Keycloak Health Endpoints](https://www.keycloak.org/server/health)

---

## 3. SQLite with Docker Volumes

### Decision
Use Better-SQLite3 with file-based database in Docker bind mount (./data/vvd-mimic.db) with WAL mode enabled for better concurrency.

### Rationale
- **Simplicity**: No separate database container, embedded database perfect for single-user prototype
- **Persistence**: Bind mount ensures database survives container restarts and rebuilds
- **Performance**: SQLite in-memory performance for localhost queries (<10ms for simple queries)
- **WAL mode**: Write-Ahead Logging allows concurrent reads during writes (better than default rollback journal)
- **Constitutional alignment**: Prototype-first (Constitution VI) - SQLite acceptable for local prototype, handles 100 campaigns easily

### Implementation Approach

**docker-compose.yml volume configuration**:
```yaml
backend:
  build:
    context: ./backend
  volumes:
    - ./data:/app/data  # Bind mount for SQLite file
    - ./backend/src:/app/src  # Hot reload for development
  environment:
    DATABASE_PATH: /app/data/vvd-mimic.db
```

**Backend Dockerfile**:
```dockerfile
FROM node:20-slim

# Install better-sqlite3 native dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Ensure data directory exists
RUN mkdir -p /app/data

CMD ["npm", "run", "dev"]
```

**DatabaseService implementation** (`backend/src/services/DatabaseService.ts`):
```typescript
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || '/app/data/vvd-mimic.db';

// Ensure data directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Initialize database with WAL mode
export const db = new Database(DB_PATH, {
  verbose: console.log // Logs SQL in development
});

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Run migrations on startup
export function runMigrations() {
  const schemaPath = path.join(__dirname, '../db/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
}

runMigrations();
```

**Schema with proper indexes** (`backend/src/db/schema.sql`):
```sql
-- User table (Keycloak sub as primary key)
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,  -- Keycloak sub claim
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  byollm_config TEXT  -- JSON string for BYOLLM settings
);

-- Campaign table
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  public_url_id TEXT UNIQUE,  -- Random ID for public access
  public_access_enabled INTEGER DEFAULT 0,  -- Boolean (0/1)
  public_password TEXT,  -- Optional password
  last_published_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_campaigns_owner ON campaigns(owner_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_public_url ON campaigns(public_url_id);

-- Session table
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
```

### Pitfalls to Avoid
1. **Permission issues**: Container runs as node user - ensure ./data directory has correct permissions (chmod 777 ./data for development)
2. **Absolute vs relative paths**: Bind mount uses host path (./data), container uses absolute path (/app/data)
3. **WAL files**: SQLite WAL mode creates -wal and -shm files - ensure all three files backed up together
4. **Concurrent writes**: SQLite allows only ONE writer - acceptable for single-user, but must serialize writes
5. **Database locking**: Don't open multiple Database instances - use singleton pattern
6. **INTEGER timestamps**: SQLite doesn't have native date type - use Unix timestamps (INTEGER) for portability

### Performance Optimizations
```typescript
// Use transactions for bulk operations
export function createCampaignBatch(campaigns: Campaign[]) {
  const insert = db.prepare(`
    INSERT INTO campaigns (id, name, owner_id, public_url_id)
    VALUES (?, ?, ?, ?)
  `);

  const insertMany = db.transaction((campaigns) => {
    for (const campaign of campaigns) {
      insert.run(campaign.id, campaign.name, campaign.ownerId, campaign.publicUrlId);
    }
  });

  insertMany(campaigns);
}

// Prepared statements for frequently-used queries
const getCampaignsByOwner = db.prepare(`
  SELECT * FROM campaigns WHERE owner_id = ? ORDER BY updated_at DESC
`);
```

### Backup Strategy (for users)
```bash
# User can backup entire data directory
cp -r ./data ./data-backup-$(date +%Y%m%d)

# Or use SQLite backup command
sqlite3 ./data/vvd-mimic.db ".backup './data/vvd-mimic-backup.db'"
```

### References
- [Better-SQLite3 Documentation](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
- [SQLite WAL Mode](https://www.sqlite.org/wal.html)
- [Docker Bind Mounts](https://docs.docker.com/storage/bind-mounts/)
- [SQLite Best Practices](https://www.sqlite.org/bestpractice.html)

---

## 4. Keycloak-js OAuth Flow in React

### Decision
Use keycloak-js library with React Context for authentication state management, implementing Authorization Code Flow with PKCE for secure token handling.

### Rationale
- **Official library**: keycloak-js is Keycloak's official JavaScript adapter
- **PKCE security**: Proof Key for Code Exchange protects against authorization code interception (critical for public clients)
- **Silent refresh**: Automatically refreshes tokens before expiration without user interaction
- **React Context**: Centralized auth state prevents prop drilling, accessible from any component
- **Protected routes**: React Router integration enables declarative route protection

### Implementation Approach

**Keycloak initialization** (`frontend/src/services/keycloakService.ts`):
```typescript
import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL, // http://localhost:8080
  realm: import.meta.env.VITE_KEYCLOAK_REALM, // vvd-mimic
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID, // vvd-mimic-frontend
};

export const keycloak = new Keycloak(keycloakConfig);

export async function initKeycloak() {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'check-sso', // Don't force login on page load
      checkLoginIframe: false, // Disable for localhost (CORS issues)
      pkceMethod: 'S256', // Enable PKCE
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
    });

    if (authenticated) {
      console.log('User authenticated:', keycloak.tokenParsed);
      // Setup token refresh
      setupTokenRefresh();
    }

    return authenticated;
  } catch (error) {
    console.error('Keycloak init failed:', error);
    throw error;
  }
}

function setupTokenRefresh() {
  // Refresh token 30 seconds before expiration
  const refreshInterval = (keycloak.tokenParsed!.exp! * 1000 - Date.now()) - 30000;

  setTimeout(async () => {
    try {
      const refreshed = await keycloak.updateToken(30);
      if (refreshed) {
        console.log('Token refreshed');
        setupTokenRefresh(); // Schedule next refresh
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      keycloak.logout();
    }
  }, refreshInterval);
}
```

**AuthContext** (`frontend/src/contexts/AuthContext.tsx`):
```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { keycloak, initKeycloak } from '../services/keycloakService';

interface AuthContextType {
  isAuthenticated: boolean;
  user: {
    id: string;
    username: string;
    email: string;
  } | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  token: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initKeycloak()
      .then((authenticated) => {
        setIsAuthenticated(authenticated);
        if (authenticated && keycloak.tokenParsed) {
          setUser({
            id: keycloak.tokenParsed.sub!,
            username: keycloak.tokenParsed.preferred_username!,
            email: keycloak.tokenParsed.email!,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async () => {
    await keycloak.login({
      redirectUri: window.location.origin + '/campaigns',
    });
  };

  const logout = async () => {
    await keycloak.logout({
      redirectUri: window.location.origin,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        logout,
        token: keycloak.token || null,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

**Protected Route component** (`frontend/src/components/shared/ProtectedRoute.tsx`):
```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

**React Router configuration** (`frontend/src/routes/AppRoutes.tsx`):
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { CampaignsPage } from '../pages/CampaignsPage';
import { CampaignPage } from '../pages/CampaignPage';
import { ProtectedRoute } from '../components/shared/ProtectedRoute';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/campaigns"
          element={
            <ProtectedRoute>
              <CampaignsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:id"
          element={
            <ProtectedRoute>
              <CampaignPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

### Pitfalls to Avoid
1. **checkLoginIframe on localhost**: Causes CORS errors - set to `false` for development
2. **Token in localStorage**: Keycloak-js handles token storage - don't manually store in localStorage (security risk)
3. **Expired token requests**: Always call `updateToken()` before API requests in axios interceptor
4. **Login redirect loop**: Use `check-sso` instead of `login-required` to avoid forcing login on every page load
5. **Silent check-sso HTML missing**: Create `/public/silent-check-sso.html` with minimal HTML for iframe SSO check
6. **PKCE disabled**: Must set `pkceMethod: 'S256'` explicitly for public clients

### Axios Interceptor for Token Injection
```typescript
// frontend/src/services/apiClient.ts
import axios from 'axios';
import { keycloak } from './keycloakService';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // http://localhost:3001
});

apiClient.interceptors.request.use(async (config) => {
  // Refresh token if expiring soon (within 30 seconds)
  await keycloak.updateToken(30);

  if (keycloak.token) {
    config.headers.Authorization = `Bearer ${keycloak.token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token invalid/expired - redirect to login
      keycloak.logout();
    }
    return Promise.reject(error);
  }
);
```

### References
- [Keycloak JavaScript Adapter](https://www.keycloak.org/docs/latest/securing_apps/#_javascript_adapter)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [React Router Protected Routes](https://reactrouter.com/en/main/start/tutorial)

---

## 5. Keycloak Connect Middleware for Express

### Decision
Use keycloak-connect middleware for Express to validate Bearer tokens on protected API routes, with custom middleware for user extraction.

### Rationale
- **Official library**: keycloak-connect is Keycloak's official Node.js adapter
- **Token introspection**: Validates tokens against Keycloak server (prevents fake/expired tokens)
- **Automatic 401 responses**: Invalid tokens automatically rejected before reaching route handlers
- **Role support**: Built-in RBAC support (not used in MVP, but available for future)
- **Session management**: Can track sessions in database for audit trail

### Implementation Approach

**Keycloak middleware setup** (`backend/src/middleware/keycloak.ts`):
```typescript
import Keycloak from 'keycloak-connect';
import session from 'express-session';

// Session store (in-memory for prototype, Redis for production)
const memoryStore = new session.MemoryStore();

export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: true,
  store: memoryStore,
});

// Keycloak configuration
const keycloakConfig = {
  'realm': process.env.KEYCLOAK_REALM!, // vvd-mimic
  'auth-server-url': process.env.KEYCLOAK_URL!, // http://keycloak:8080
  'ssl-required': 'none', // Localhost doesn't need SSL
  'resource': process.env.KEYCLOAK_CLIENT_ID!, // vvd-mimic-backend
  'bearer-only': true, // Backend doesn't redirect to login, just validates tokens
  'confidential-port': 0,
};

export const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);

// Protect route middleware
export const protect = keycloak.protect();

// Extract user from token middleware
export function extractUser(req: any, res: any, next: any) {
  if (req.kauth && req.kauth.grant) {
    const token = req.kauth.grant.access_token;
    req.user = {
      id: token.content.sub,
      username: token.content.preferred_username,
      email: token.content.email,
    };
  }
  next();
}
```

**Express server setup** (`backend/src/server.ts`):
```typescript
import express from 'express';
import cors from 'cors';
import { sessionMiddleware, keycloak } from './middleware/keycloak';
import authRoutes from './routes/auth';
import campaignRoutes from './routes/campaigns';
import healthRoutes from './routes/health';

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

// Session + Keycloak middleware
app.use(sessionMiddleware);
app.use(keycloak.middleware());

// Public routes
app.use('/health', healthRoutes);

// Protected routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
```

**Protected route example** (`backend/src/routes/campaigns.ts`):
```typescript
import express from 'express';
import { protect, extractUser } from '../middleware/keycloak';
import { CampaignService } from '../services/CampaignService';

const router = express.Router();

// All routes in this router require authentication
router.use(protect, extractUser);

// GET /api/campaigns - List user's campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await CampaignService.getCampaignsByOwner(req.user.id);
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/campaigns - Create new campaign
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const campaign = await CampaignService.createCampaign({
      name,
      ownerId: req.user.id,
    });
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/campaigns/:id - Delete campaign
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const campaign = await CampaignService.getCampaignById(id);
    if (campaign.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await CampaignService.deleteCampaign(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Pitfalls to Avoid
1. **Network name confusion**: Backend MUST use `http://keycloak:8080` (Docker network name), NOT `http://localhost:8080`
2. **bearer-only required**: Backend clients MUST set `bearer-only: true` - they don't redirect, just validate
3. **ssl-required in dev**: Set to `'none'` for localhost, `'external'` for production
4. **Session store in production**: MemoryStore loses sessions on restart - use Redis/PostgreSQL for production
5. **Token in request headers**: Frontend MUST send `Authorization: Bearer <token>` header (keycloak-js does this automatically)
6. **Middleware order**: Session middleware MUST come before keycloak.middleware()

### Token Validation Flow
```
1. Frontend: axios request with Authorization: Bearer <token>
2. Backend: keycloak.protect() intercepts
3. Keycloak Connect: Extracts token from header
4. Keycloak Connect: Introspects token against Keycloak server (http://keycloak:8080)
5. Keycloak: Validates signature, expiration, issuer
6. Backend: If valid, req.kauth populated with grant
7. Backend: extractUser middleware extracts user info
8. Route handler: Accesses req.user
```

### Performance Consideration
Token introspection adds ~50-100ms per request. For high-performance needs, cache validated tokens in Redis with TTL matching token expiration.

### References
- [Keycloak Node.js Adapter](https://www.keycloak.org/docs/latest/securing_apps/#_nodejs_adapter)
- [Express Session](https://expressjs.com/en/resources/middleware/session.html)
- [Bearer Token Authentication](https://datatracker.ietf.org/doc/html/rfc6750)

---

## 6. CORS Configuration for Docker Services

### Decision
Configure Express CORS middleware to allow requests from http://localhost:3000 (frontend) with credentials enabled.

### Rationale
- **Browser security**: CORS required for frontend (localhost:3000) to call backend (localhost:3001)
- **Credentials needed**: Cookies/session data must be sent with requests (credentials: true)
- **Specific origin**: Wildcard (*) doesn't work with credentials - must specify exact origin
- **Preflight requests**: OPTIONS requests automatically handled by CORS middleware

### Implementation Approach

**Backend CORS configuration** (`backend/src/middleware/cors.ts`):
```typescript
import cors from 'cors';

export const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true, // Allow cookies/authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'], // Custom headers visible to frontend
  maxAge: 86400, // Preflight cache for 24 hours
};

export const corsMiddleware = cors(corsOptions);
```

**Express integration**:
```typescript
import express from 'express';
import { corsMiddleware } from './middleware/cors';

const app = express();

// CORS MUST come before routes
app.use(corsMiddleware);

// Rest of middleware and routes...
```

**Frontend axios configuration** (`frontend/src/services/apiClient.ts`):
```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // http://localhost:3001
  withCredentials: true, // Send cookies with requests
});
```

### Pitfalls to Avoid
1. **Wildcard with credentials**: `origin: '*'` FAILS when `credentials: true` - must specify exact origin
2. **CORS after routes**: CORS middleware MUST be registered before route handlers
3. **Missing OPTIONS**: Browser sends preflight OPTIONS request before POST/PUT/DELETE - must be allowed
4. **Docker network confusion**: Frontend runs in browser (localhost:3000), NOT in Docker network
5. **Production origin**: Change CORS_ORIGIN environment variable for non-localhost deployments
6. **Authorization header**: Must explicitly include 'Authorization' in allowedHeaders

### Preflight Request Flow
```
Browser (localhost:3000):
  OPTIONS http://localhost:3001/api/campaigns
  Origin: http://localhost:3000
  Access-Control-Request-Method: POST
  Access-Control-Request-Headers: authorization,content-type

Backend (localhost:3001):
  Access-Control-Allow-Origin: http://localhost:3000
  Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
  Access-Control-Allow-Headers: Content-Type,Authorization
  Access-Control-Allow-Credentials: true

Browser:
  ✓ Preflight passed, proceed with actual POST request
```

### Development vs Production
```typescript
// Development (localhost)
const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
};

// Production (if deployed to external domain)
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? 'https://vvd-mimic.app'
    : 'http://localhost:3000',
  credentials: true,
};
```

### Debugging CORS Issues
```bash
# Check browser console for CORS errors
# Common error: "Access to XMLHttpRequest at 'http://localhost:3001/api/campaigns'
# from origin 'http://localhost:3000' has been blocked by CORS policy"

# Verify CORS headers in response
curl -v -X OPTIONS http://localhost:3001/api/campaigns \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST"

# Should see:
# Access-Control-Allow-Origin: http://localhost:3000
# Access-Control-Allow-Credentials: true
```

### References
- [CORS MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Express CORS Middleware](https://expressjs.com/en/resources/middleware/cors.html)
- [Axios withCredentials](https://axios-http.com/docs/req_config)

---

## 7. Public URL Generation for Campaigns

### Decision
Use Node.js crypto.randomBytes with base64url encoding to generate 16-character random IDs, with database uniqueness constraint to prevent collisions.

### Rationale
- **Security**: crypto.randomBytes uses cryptographically secure PRNG (not Math.random())
- **Collision resistance**: 16 characters base64url = 96 bits entropy (2^96 combinations)
- **URL-safe encoding**: base64url avoids +, /, = characters that need escaping in URLs
- **Database constraint**: UNIQUE constraint on public_url_id prevents accidental duplicates
- **Constitutional alignment**: Privacy-first (Constitution V) - unguessable URLs prevent unauthorized access

### Implementation Approach

**Public URL generation utility** (`backend/src/utils/generatePublicId.ts`):
```typescript
import crypto from 'crypto';

/**
 * Generates cryptographically secure random ID for public campaign URLs
 * Format: 16 characters, base64url encoding (URL-safe)
 * Example: a8f3D92k4p1mN7qR
 */
export function generatePublicId(): string {
  // Generate 12 random bytes (96 bits of entropy)
  const buffer = crypto.randomBytes(12);

  // Convert to base64url (URL-safe: no +, /, =)
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Validates public ID format
 */
export function isValidPublicId(id: string): boolean {
  return /^[A-Za-z0-9_-]{16}$/.test(id);
}
```

**Campaign creation with public ID** (`backend/src/services/CampaignService.ts`):
```typescript
import { db } from './DatabaseService';
import { generatePublicId } from '../utils/generatePublicId';
import crypto from 'crypto';

export class CampaignService {
  static async createCampaign(data: { name: string; ownerId: string }) {
    const campaignId = crypto.randomUUID(); // Standard UUID v4 for campaign ID
    const publicUrlId = generatePublicId(); // Random ID for public URL

    // Insert with retry on collision (extremely unlikely)
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const stmt = db.prepare(`
          INSERT INTO campaigns (id, name, owner_id, public_url_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        const now = Math.floor(Date.now() / 1000);
        stmt.run(campaignId, data.name, data.ownerId, publicUrlId, now, now);

        return {
          id: campaignId,
          name: data.name,
          ownerId: data.ownerId,
          publicUrlId,
          publicAccessEnabled: false,
          createdAt: new Date(now * 1000),
          updatedAt: new Date(now * 1000),
        };
      } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' && attempts < maxAttempts - 1) {
          // Collision detected, retry with new ID
          attempts++;
          publicUrlId = generatePublicId();
          continue;
        }
        throw error;
      }
    }

    throw new Error('Failed to generate unique public URL ID');
  }

  static async getCampaignByPublicId(publicUrlId: string) {
    const stmt = db.prepare(`
      SELECT * FROM campaigns WHERE public_url_id = ? AND public_access_enabled = 1
    `);
    return stmt.get(publicUrlId);
  }
}
```

**Frontend public URL display** (`frontend/src/components/CampaignSettings.tsx`):
```typescript
function CampaignSettings({ campaign }: { campaign: Campaign }) {
  const publicUrl = `${window.location.origin}/c/${campaign.publicUrlId}`;

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    // Show toast notification
  };

  return (
    <div>
      <h3>Public Sharing</h3>
      <label>
        <input
          type="checkbox"
          checked={campaign.publicAccessEnabled}
          onChange={handleTogglePublicAccess}
        />
        Enable Public Access
      </label>

      {campaign.publicAccessEnabled && (
        <div>
          <input type="text" value={publicUrl} readOnly />
          <button onClick={copyPublicUrl}>Copy URL</button>
        </div>
      )}
    </div>
  );
}
```

### Pitfalls to Avoid
1. **Math.random() instead of crypto.randomBytes**: NOT cryptographically secure, easily guessed
2. **Too short IDs**: 8 characters = 48 bits (vulnerable to brute force after ~16M campaigns)
3. **URL-unsafe characters**: Standard base64 includes +, /, = which need escaping in URLs
4. **No uniqueness check**: Must have UNIQUE constraint in database schema
5. **Predictable patterns**: Never use timestamp + counter (predictable sequence)
6. **Reusing IDs**: Once generated, public_url_id MUST persist forever (even if public access disabled)

### Collision Probability Analysis
```
ID space: base64url with 16 characters = 64^16 = 2^96 ≈ 7.9 × 10^28
Collision probability (birthday paradox):
  - After 1 million campaigns: ~1 in 10^20 (negligible)
  - After 1 billion campaigns: ~1 in 10^12 (still negligible)

Conclusion: Collisions effectively impossible for local prototype scale
```

### Security Considerations
- **Timing attacks**: Public ID lookup should use constant-time comparison (SQLite does this automatically)
- **Enumeration attacks**: Random IDs prevent sequential enumeration (unlike auto-increment IDs)
- **Privacy**: URLs themselves don't leak information (unlike slugified campaign names)
- **Optional password**: For extra security, campaigns can add password protection (separate feature)

### References
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html#cryptorandombytessize-callback)
- [Base64url Encoding](https://datatracker.ietf.org/doc/html/rfc4648#section-5)
- [Birthday Problem](https://en.wikipedia.org/wiki/Birthday_problem)

---

## 8. Docker Hot Reload for Development

### Decision
Use nodemon for backend hot reload and Vite HMR (Hot Module Replacement) for frontend, with source code bind mounts in docker-compose.yml.

### Rationale
- **Development speed**: Code changes reflect immediately without container rebuild
- **Preserved state**: Vite HMR updates components without full page refresh
- **Debugging efficiency**: Logs and errors appear instantly in docker-compose output
- **Production separation**: Hot reload only in development, production uses built artifacts
- **Constitutional alignment**: Prototype-first (Constitution VI) - optimize for iteration speed

### Implementation Approach

**Backend hot reload** (`backend/package.json`):
```json
{
  "scripts": {
    "dev": "nodemon --watch src --ext ts --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "devDependencies": {
    "nodemon": "^3.0.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.0.0"
  }
}
```

**Nodemon configuration** (`backend/nodemon.json`):
```json
{
  "watch": ["src"],
  "ext": "ts,js,json",
  "ignore": ["src/**/*.test.ts", "node_modules"],
  "exec": "ts-node src/server.ts",
  "env": {
    "NODE_ENV": "development"
  }
}
```

**Backend Dockerfile (development)**:
```dockerfile
FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source (will be overridden by volume mount in dev)
COPY . .

# Expose port
EXPOSE 3001

# Run with nodemon for hot reload
CMD ["npm", "run", "dev"]
```

**Frontend hot reload** (`frontend/package.json`):
```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}
```

**Vite configuration** (`frontend/vite.config.ts`):
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all interfaces (required for Docker)
    port: 3000,
    watch: {
      usePolling: true, // Required for Docker volume mounts on some systems
    },
    hmr: {
      clientPort: 3000, // HMR websocket port
    },
  },
});
```

**Frontend Dockerfile (development)**:
```dockerfile
FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source (will be overridden by volume mount in dev)
COPY . .

# Expose port
EXPOSE 3000

# Run with Vite dev server
CMD ["npm", "run", "dev"]
```

**Docker Compose volume configuration**:
```yaml
services:
  backend:
    build:
      context: ./backend
    volumes:
      - ./backend/src:/app/src  # Mount source for hot reload
      - ./backend/package.json:/app/package.json
      - ./data:/app/data  # SQLite persistence
      # DON'T mount node_modules (causes conflicts)
    environment:
      NODE_ENV: development

  frontend:
    build:
      context: ./frontend
    volumes:
      - ./frontend/src:/app/src  # Mount source for hot reload
      - ./frontend/index.html:/app/index.html
      - ./frontend/vite.config.ts:/app/vite.config.ts
      # DON'T mount node_modules (causes conflicts)
    environment:
      NODE_ENV: development
```

### Pitfalls to Avoid
1. **Mounting node_modules**: NEVER mount node_modules directory - causes native module conflicts between host and container
2. **usePolling required**: Some systems (Windows, macOS) need polling for file change detection in Docker volumes
3. **Host 0.0.0.0**: Vite MUST listen on 0.0.0.0 (not localhost) to be accessible from host machine
4. **HMR websocket**: Vite HMR uses websocket - ensure port 3000 exposed and clientPort configured
5. **TypeScript compilation**: nodemon with ts-node compiles on-the-fly (slower than pre-compiled, acceptable for dev)
6. **File permissions**: Volume-mounted files inherit host permissions - can cause issues on Linux

### Performance Optimization
```typescript
// backend/src/server.ts
if (process.env.NODE_ENV === 'development') {
  // Enable detailed logging in dev
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// frontend/vite.config.ts
export default defineConfig({
  server: {
    watch: {
      // Ignore large directories
      ignored: ['**/node_modules/**', '**/dist/**'],
    },
  },
});
```

### Production Build
```yaml
# docker-compose.prod.yml (different from dev)
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    # No volume mounts in production
    command: ["npm", "start"]  # Run compiled JS

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    # Serve built static files with nginx
```

**Frontend production Dockerfile**:
```dockerfile
# Build stage
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Development Workflow
```bash
# Start all services with hot reload
docker-compose up

# Edit backend/src/services/CampaignService.ts
# → Nodemon detects change → Restarts server → Changes live in ~2s

# Edit frontend/src/components/CampaignManagement.tsx
# → Vite HMR detects change → Hot swaps component → Changes live instantly

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### References
- [Nodemon Documentation](https://nodemon.io/)
- [Vite HMR Documentation](https://vitejs.dev/guide/features.html#hot-module-replacement)
- [Docker Volumes](https://docs.docker.com/storage/volumes/)
- [Vite Docker Guide](https://vitejs.dev/guide/migration.html#docker)

---

## Summary

All 8 critical research areas have been thoroughly investigated with concrete implementation approaches. Key decisions:

1. **Keycloak**: Official Docker image with realm-export.json, dev-file database
2. **Docker Compose**: Health checks with service dependencies (Keycloak → Backend → Frontend)
3. **SQLite**: Better-SQLite3 with WAL mode, Docker bind mount for persistence
4. **Frontend Auth**: keycloak-js with PKCE, React Context, protected routes
5. **Backend Auth**: keycloak-connect middleware with token introspection
6. **CORS**: Specific origin (localhost:3000) with credentials enabled
7. **Public URLs**: crypto.randomBytes with base64url (16 characters, 96-bit entropy)
8. **Hot Reload**: Nodemon (backend) + Vite HMR (frontend) with source bind mounts

**Next Phase**: Phase 1 (Design & Contracts) - create data-model.md, API contracts, quickstart.md, CLAUDE.md
