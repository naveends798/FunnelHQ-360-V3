-- Fixed Safe Organizations Migration - Checks for both tables and columns before creating indexes
-- This migration can be run on existing databases without conflicts

-- Create organizations table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  clerk_org_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  plan TEXT NOT NULL DEFAULT 'pro_trial',
  plan_status TEXT DEFAULT 'active',
  billing_email TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  max_projects INTEGER DEFAULT 100,
  max_team_members INTEGER DEFAULT 10,
  settings JSONB DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create organization_memberships table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS organization_memberships (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  permissions JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by TEXT,
  invitation_accepted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(organization_id, clerk_user_id)
);

-- Create organization_invitations table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS organization_invitations (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  permissions JSONB DEFAULT '[]',
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  invited_by TEXT NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by TEXT,
  clerk_invitation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, email)
);

-- Add organization_id columns to existing tables (if they don't exist)
DO $$ 
BEGIN 
  -- Add to clients table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='organization_id') THEN
    ALTER TABLE clients ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Add to projects table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='organization_id') THEN
    ALTER TABLE projects ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Add to assets table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='organization_id') THEN
    ALTER TABLE assets ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Add to activities table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activities' AND column_name='organization_id') THEN
    ALTER TABLE activities ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Add to project_tasks table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_tasks' AND column_name='organization_id') THEN
    ALTER TABLE project_tasks ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Add to project_designs table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_designs' AND column_name='organization_id') THEN
    ALTER TABLE project_designs ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Add to notifications table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='organization_id') THEN
    ALTER TABLE notifications ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Add to support_tickets table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='organization_id') THEN
    ALTER TABLE support_tickets ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes only if they don't exist AND the columns exist
DO $$
BEGIN
  -- Organizations indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organizations_clerk_org_id') THEN
    CREATE INDEX idx_organizations_clerk_org_id ON organizations(clerk_org_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organizations_slug') THEN
    CREATE INDEX idx_organizations_slug ON organizations(slug);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organizations_plan') THEN
    CREATE INDEX idx_organizations_plan ON organizations(plan);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organizations_created_by') THEN
    CREATE INDEX idx_organizations_created_by ON organizations(created_by);
  END IF;

  -- Organization memberships indexes (check for column existence first)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organization_memberships_organization_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization_memberships' AND column_name='organization_id') THEN
      CREATE INDEX idx_organization_memberships_organization_id ON organization_memberships(organization_id);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organization_memberships_clerk_user_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization_memberships' AND column_name='clerk_user_id') THEN
      CREATE INDEX idx_organization_memberships_clerk_user_id ON organization_memberships(clerk_user_id);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organization_memberships_role') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization_memberships' AND column_name='role') THEN
      CREATE INDEX idx_organization_memberships_role ON organization_memberships(role);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organization_memberships_status') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization_memberships' AND column_name='status') THEN
      CREATE INDEX idx_organization_memberships_status ON organization_memberships(status);
    END IF;
  END IF;

  -- Organization invitations indexes (check for column existence first)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organization_invitations_organization_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization_invitations' AND column_name='organization_id') THEN
      CREATE INDEX idx_organization_invitations_organization_id ON organization_invitations(organization_id);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organization_invitations_email') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization_invitations' AND column_name='email') THEN
      CREATE INDEX idx_organization_invitations_email ON organization_invitations(email);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organization_invitations_token') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization_invitations' AND column_name='token') THEN
      CREATE INDEX idx_organization_invitations_token ON organization_invitations(token);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organization_invitations_expires_at') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization_invitations' AND column_name='expires_at') THEN
      CREATE INDEX idx_organization_invitations_expires_at ON organization_invitations(expires_at);
    END IF;
  END IF;

  -- Existing table organization_id indexes (check for column existence first)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_clients_organization_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='organization_id') THEN
      CREATE INDEX idx_clients_organization_id ON clients(organization_id);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_organization_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='organization_id') THEN
      CREATE INDEX idx_projects_organization_id ON projects(organization_id);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_assets_organization_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='organization_id') THEN
      CREATE INDEX idx_assets_organization_id ON assets(organization_id);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_activities_organization_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activities' AND column_name='organization_id') THEN
      CREATE INDEX idx_activities_organization_id ON activities(organization_id);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_project_tasks_organization_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_tasks' AND column_name='organization_id') THEN
      CREATE INDEX idx_project_tasks_organization_id ON project_tasks(organization_id);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_project_designs_organization_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_designs' AND column_name='organization_id') THEN
      CREATE INDEX idx_project_designs_organization_id ON project_designs(organization_id);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_organization_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='organization_id') THEN
      CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_support_tickets_organization_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='organization_id') THEN
      CREATE INDEX idx_support_tickets_organization_id ON support_tickets(organization_id);
    END IF;
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE organizations IS 'Organizations table for multi-tenant architecture';
COMMENT ON TABLE organization_memberships IS 'User memberships within organizations';
COMMENT ON TABLE organization_invitations IS 'Pending invitations to join organizations';