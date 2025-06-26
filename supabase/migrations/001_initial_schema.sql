-- FunnelHQ 360 - Initial Database Schema
-- User-centric architecture (no organizations)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with company and subscription information
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  supabase_id UUID UNIQUE, -- Maps to Supabase auth user ID
  username TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar TEXT,
  specialization TEXT, -- developer, designer, project_manager
  
  -- Company information (moved from organizations)
  company_name TEXT,
  company_role TEXT, -- founder, manager, freelancer, etc.
  industry TEXT,
  company_size TEXT, -- 1-10, 11-50, 51-200, 200+
  
  -- Subscription information (user-level billing)
  subscription_plan TEXT DEFAULT 'solo', -- solo, pro
  subscription_status TEXT DEFAULT 'active', -- active, canceled, past_due
  max_projects INTEGER DEFAULT 3,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- User collaborations - direct user-to-user relationships
CREATE TABLE user_collaborations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collaborator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- team_member, client
  permissions JSONB DEFAULT '[]', -- Granular permissions array
  status TEXT DEFAULT 'active', -- active, suspended, removed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, collaborator_id)
);

-- User invitations - project-specific invitations
CREATE TABLE user_invitations (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- team_member, client
  specialization TEXT, -- developer, designer, project_manager
  invited_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER, -- Optional: specific project invitation (FK added later)
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT,
  notes TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects with user ownership
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, paused, cancelled
  progress INTEGER DEFAULT 0,
  budget DECIMAL(10, 2) NOT NULL,
  budget_used DECIMAL(10, 2) DEFAULT 0,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  image TEXT,
  priority TEXT DEFAULT 'medium', -- low, medium, high
  team_members JSONB DEFAULT '[]', -- Deprecated: use project_team_members table
  tags JSONB DEFAULT '[]',
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add the foreign key reference for project invitations
ALTER TABLE user_invitations 
ADD CONSTRAINT fk_user_invitations_project 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Project team member assignments with roles
CREATE TABLE project_team_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- project_manager, developer, designer, reviewer, client
  permissions JSONB DEFAULT '[]', -- project-specific permissions
  assigned_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(project_id, user_id)
);

-- Milestones
CREATE TABLE milestones (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  order_index INTEGER DEFAULT 0
);

-- Activities/Timeline
CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL, -- milestone_completed, message_received, document_uploaded, payment_received
  title TEXT NOT NULL,
  description TEXT,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Documents
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- pdf, doc, image, etc.
  url TEXT NOT NULL,
  size INTEGER, -- in bytes
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Project messages
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL, -- client, team_member
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false
);

-- Direct messages between admin and clients
CREATE TABLE direct_messages (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL, -- admin, client
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false
);

-- Direct messages between admin and team members
CREATE TABLE team_direct_messages (
  id SERIAL PRIMARY KEY,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL, -- admin, team_member
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false
);

-- Onboarding forms for dynamic client intake
CREATE TABLE onboarding_forms (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL, -- Dynamic form fields
  is_template BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form submissions from clients
CREATE TABLE form_submissions (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL REFERENCES onboarding_forms(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  is_completed BOOLEAN DEFAULT true,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ
);

-- Project comments and threads
CREATE TABLE project_comments (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES project_comments(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL, -- admin, team_member, client
  content TEXT NOT NULL,
  mentions JSONB DEFAULT '[]', -- User IDs mentioned
  attachments JSONB DEFAULT '[]', -- File URLs
  status TEXT DEFAULT 'open', -- open, in_progress, resolved
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Real-time notifications
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- comment, mention, project_update, form_submission, etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- Additional data
  is_read BOOLEAN DEFAULT false,
  action_url TEXT, -- URL to navigate when clicked
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Support tickets
CREATE TABLE support_tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- bug, feature, billing, support
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  status TEXT DEFAULT 'open', -- open, in_progress, resolved, closed
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Support ticket messages
CREATE TABLE support_ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL, -- user, admin
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_internal BOOLEAN DEFAULT false, -- Internal admin notes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File uploads and assets
CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  type TEXT NOT NULL, -- image, document, video, etc.
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL, -- bytes
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder TEXT DEFAULT 'root', -- User folder structure
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project tasks for Kanban
CREATE TABLE project_tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo', -- todo, in_progress, review, done
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  estimated_hours DECIMAL(4, 1),
  actual_hours DECIMAL(4, 1),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  position INTEGER DEFAULT 0, -- For drag & drop ordering
  labels JSONB DEFAULT '[]',
  checklist JSONB DEFAULT '[]',
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project designs (Figma, funnel designs, etc.)
CREATE TABLE project_designs (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  type TEXT NOT NULL, -- figma, funnel, wireframe, mockup
  original_url TEXT, -- Original Figma URL or source
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'review', -- draft, review, approved, changes_needed
  uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Design comments with status tracking
CREATE TABLE design_comments (
  id SERIAL PRIMARY KEY,
  design_id INTEGER NOT NULL REFERENCES project_designs(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES design_comments(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL, -- admin, team_member, client
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  position JSONB, -- Position on design for pinpoint comments {x: number, y: number}
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_supabase_id ON users(supabase_id);
CREATE INDEX idx_users_subscription_plan ON users(subscription_plan);
CREATE INDEX idx_user_collaborations_user_id ON user_collaborations(user_id);
CREATE INDEX idx_user_collaborations_collaborator_id ON user_collaborations(collaborator_id);
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_token ON user_invitations(token);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_team_members_project_id ON project_team_members(project_id);
CREATE INDEX idx_project_team_members_user_id ON project_team_members(user_id);
CREATE INDEX idx_activities_project_id ON activities(project_id);
CREATE INDEX idx_activities_created_at ON activities(created_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_assets_owner_id ON assets(owner_id);
CREATE INDEX idx_assets_project_id ON assets(project_id);