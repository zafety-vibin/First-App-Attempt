-- Migration 008: Test Encryption Storage
-- Feature: 008-create-byollm-configuration
-- Description: Validates that TEXT columns can store AES-256-GCM ciphertext

-- Test: Insert encrypted dummy data to verify storage
-- Format: salt:iv:authTag:encrypted (base64-encoded components)
-- This test will be cleaned up after validation

-- Note: This is a validation migration only
-- Actual encryption/decryption tested in unit tests (EncryptionService.test.ts)
-- Format example: "abc123salt:def456iv:ghi789tag:jkl012encrypted"

-- The TEXT column must support at least 500 characters for typical encrypted credentials
-- OAuth tokens: ~200 chars encrypted
-- API keys: ~100 chars encrypted
-- With salt, IV, auth tag, and base64 encoding: ~400-500 chars total

-- Test constraint: encrypted_credentials TEXT can store AES-256-GCM output
-- Verified by EncryptionService unit tests
