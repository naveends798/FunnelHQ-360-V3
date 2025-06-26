-- Add activity_audit table to track user activities
-- This table seems to exist in the database but not in the schema

CREATE TABLE IF NOT EXISTS activity_audit (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER DEFAULT 1, -- Default organization for backward compatibility
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id INTEGER,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_audit_user_id ON activity_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_audit_organization_id ON activity_audit(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_audit_created_at ON activity_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_audit_action ON activity_audit(action);

-- Add comment
COMMENT ON TABLE activity_audit IS 'Tracks user activities and actions for audit purposes';

-- Ensure existing records have organization_id set
UPDATE activity_audit SET organization_id = 1 WHERE organization_id IS NULL;

-- Make organization_id NOT NULL after updating existing records
ALTER TABLE activity_audit ALTER COLUMN organization_id SET NOT NULL;