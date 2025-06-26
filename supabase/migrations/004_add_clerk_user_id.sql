-- Migration: Add clerk_user_id column to users table
-- This fixes the webhook user creation issue

-- Add clerk_user_id column to users table
ALTER TABLE users ADD COLUMN clerk_user_id TEXT UNIQUE;

-- Add index for performance
CREATE INDEX idx_users_clerk_user_id ON users(clerk_user_id);

-- Add comment
COMMENT ON COLUMN users.clerk_user_id IS 'Clerk user ID for authentication integration';