-- Wrldbldr MCP Manager Database Schema
-- SQLite3 with Better-SQLite3
-- Feature 002: Authentication Flow & Campaign Management

-- Schema version tracking table
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- User table (Keycloak sync)
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,  -- Keycloak 'sub' claim (UUID format)
  username TEXT NOT NULL,     -- Keycloak 'preferred_username'
  email TEXT NOT NULL,        -- Keycloak 'email'
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),  -- Unix timestamp
  byollm_config TEXT          -- JSON string for BYOLLM settings (spec 008)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Campaign table
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,              -- UUID v4
  name TEXT NOT NULL,                -- Campaign display name
  owner_id TEXT NOT NULL,            -- FK to users.user_id
  public_url_id TEXT UNIQUE,         -- Random ID for public access (16 chars, base64url)
  public_access_enabled INTEGER DEFAULT 0,  -- Boolean: 0=private, 1=public
  public_password TEXT,              -- Optional password for public access
  last_published_at INTEGER,         -- Unix timestamp of last publish operation
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campaigns_owner ON campaigns(owner_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_public_url ON campaigns(public_url_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_updated ON campaigns(updated_at);

-- Session table
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,       -- UUID v4
  user_id TEXT NOT NULL,             -- FK to users.user_id
  access_token TEXT NOT NULL,        -- Keycloak access token (JWT)
  refresh_token TEXT,                -- Keycloak refresh token (optional)
  expires_at INTEGER NOT NULL,       -- Unix timestamp when access token expires
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
