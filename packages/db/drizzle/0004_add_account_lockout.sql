-- Migration: Add account lockout fields for failed login attempts
-- Created: 2026-02-05
-- Description: Adds fields to track failed login attempts and account lockout state

-- ==================================================================
-- USERS TABLE - ACCOUNT LOCKOUT FIELDS
-- ==================================================================

-- Add failed login attempts counter
ALTER TABLE users
ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0;

-- Add timestamp for last failed login attempt
ALTER TABLE users
ADD COLUMN last_failed_login_at TIMESTAMP WITH TIME ZONE;

-- Add lockout expiration timestamp
ALTER TABLE users
ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE;

-- Add index for efficient lockout queries
CREATE INDEX IF NOT EXISTS idx_users_locked_until
ON users(locked_until)
WHERE locked_until IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.failed_login_attempts IS 'Counter for consecutive failed login attempts';
COMMENT ON COLUMN users.last_failed_login_at IS 'Timestamp of the most recent failed login attempt';
COMMENT ON COLUMN users.locked_until IS 'Account is locked until this timestamp; NULL means not locked';
