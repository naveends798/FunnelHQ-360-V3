-- FunnelHQ 360 - Row Level Security (RLS) Policies
-- These policies ensure users can only access data they own or are authorized to access

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_comments ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user ID from JWT
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS INTEGER AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'app_metadata')::jsonb ->> 'clerk_user_id',
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )::INTEGER;
$$ LANGUAGE SQL STABLE;

-- Helper function to check if user is authenticated
CREATE OR REPLACE FUNCTION auth.is_authenticated() RETURNS BOOLEAN AS $$
  SELECT auth.user_id() IS NOT NULL;
$$ LANGUAGE SQL STABLE;

-- Helper function to check if user is collaborator on a project
CREATE OR REPLACE FUNCTION auth.is_project_collaborator(project_id INTEGER) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_team_members ptm
    WHERE ptm.project_id = $1 
    AND ptm.user_id = auth.user_id()
    AND ptm.is_active = true
  );
$$ LANGUAGE SQL STABLE;

-- Helper function to check if user owns or collaborates on a project
CREATE OR REPLACE FUNCTION auth.can_access_project(project_id INTEGER) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = $1 
    AND (
      p.owner_id = auth.user_id() OR
      auth.is_project_collaborator($1)
    )
  );
$$ LANGUAGE SQL STABLE;

-- Helper function to get project owner
CREATE OR REPLACE FUNCTION auth.get_project_owner(project_id INTEGER) RETURNS INTEGER AS $$
  SELECT owner_id FROM projects WHERE id = $1;
$$ LANGUAGE SQL STABLE;

-- USERS table policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.is_authenticated() AND id = auth.user_id());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.is_authenticated() AND id = auth.user_id());

CREATE POLICY "Users can view collaborators and team members"
  ON users FOR SELECT
  USING (
    auth.is_authenticated() AND (
      id = auth.user_id() OR
      EXISTS (
        SELECT 1 FROM user_collaborations uc
        WHERE (uc.user_id = auth.user_id() AND uc.collaborator_id = users.id)
           OR (uc.collaborator_id = auth.user_id() AND uc.user_id = users.id)
      ) OR
      EXISTS (
        SELECT 1 FROM project_team_members ptm
        JOIN projects p ON ptm.project_id = p.id
        WHERE ptm.user_id = users.id
        AND (p.owner_id = auth.user_id() OR auth.is_project_collaborator(p.id))
      )
    )
  );

-- USER_COLLABORATIONS table policies
CREATE POLICY "Users can view their collaborations"
  ON user_collaborations FOR SELECT
  USING (
    auth.is_authenticated() AND (
      user_id = auth.user_id() OR collaborator_id = auth.user_id()
    )
  );

CREATE POLICY "Users can manage their own collaborations"
  ON user_collaborations FOR ALL
  USING (auth.is_authenticated() AND user_id = auth.user_id());

-- USER_INVITATIONS table policies
CREATE POLICY "Users can view invitations they sent"
  ON user_invitations FOR SELECT
  USING (auth.is_authenticated() AND invited_by = auth.user_id());

CREATE POLICY "Users can manage invitations they sent"
  ON user_invitations FOR ALL
  USING (auth.is_authenticated() AND invited_by = auth.user_id());

-- CLIENTS table policies
CREATE POLICY "Users can view clients they created"
  ON clients FOR SELECT
  USING (auth.is_authenticated() AND created_by = auth.user_id());

CREATE POLICY "Users can manage clients they created"
  ON clients FOR ALL
  USING (auth.is_authenticated() AND created_by = auth.user_id());

CREATE POLICY "Team members can view clients on their projects"
  ON clients FOR SELECT
  USING (
    auth.is_authenticated() AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.client_id = clients.id
      AND auth.can_access_project(p.id)
    )
  );

-- PROJECTS table policies
CREATE POLICY "Users can view projects they own"
  ON projects FOR SELECT
  USING (auth.is_authenticated() AND owner_id = auth.user_id());

CREATE POLICY "Users can manage projects they own"
  ON projects FOR ALL
  USING (auth.is_authenticated() AND owner_id = auth.user_id());

CREATE POLICY "Team members can view projects they collaborate on"
  ON projects FOR SELECT
  USING (auth.is_authenticated() AND auth.is_project_collaborator(id));

CREATE POLICY "Team members can update projects they collaborate on"
  ON projects FOR UPDATE
  USING (auth.is_authenticated() AND auth.is_project_collaborator(id));

-- PROJECT_TEAM_MEMBERS table policies
CREATE POLICY "Project owners can manage team members"
  ON project_team_members FOR ALL
  USING (
    auth.is_authenticated() AND 
    auth.get_project_owner(project_id) = auth.user_id()
  );

CREATE POLICY "Users can view team members on their projects"
  ON project_team_members FOR SELECT
  USING (
    auth.is_authenticated() AND (
      auth.get_project_owner(project_id) = auth.user_id() OR
      auth.is_project_collaborator(project_id)
    )
  );

-- MILESTONES table policies
CREATE POLICY "Users can view milestones on accessible projects"
  ON milestones FOR SELECT
  USING (auth.is_authenticated() AND auth.can_access_project(project_id));

CREATE POLICY "Project owners can manage milestones"
  ON milestones FOR ALL
  USING (
    auth.is_authenticated() AND 
    auth.get_project_owner(project_id) = auth.user_id()
  );

CREATE POLICY "Team members can update milestone status"
  ON milestones FOR UPDATE
  USING (auth.is_authenticated() AND auth.is_project_collaborator(project_id));

-- ACTIVITIES table policies
CREATE POLICY "Users can view activities on accessible projects"
  ON activities FOR SELECT
  USING (
    auth.is_authenticated() AND (
      project_id IS NULL OR auth.can_access_project(project_id)
    )
  );

CREATE POLICY "Users can create activities on accessible projects"
  ON activities FOR INSERT
  WITH CHECK (
    auth.is_authenticated() AND (
      project_id IS NULL OR auth.can_access_project(project_id)
    )
  );

-- DOCUMENTS table policies
CREATE POLICY "Users can view documents on accessible projects"
  ON documents FOR SELECT
  USING (auth.is_authenticated() AND auth.can_access_project(project_id));

CREATE POLICY "Users can manage documents on accessible projects"
  ON documents FOR ALL
  USING (auth.is_authenticated() AND auth.can_access_project(project_id));

-- MESSAGES table policies
CREATE POLICY "Users can view messages on accessible projects"
  ON messages FOR SELECT
  USING (auth.is_authenticated() AND auth.can_access_project(project_id));

CREATE POLICY "Users can send messages on accessible projects"
  ON messages FOR INSERT
  WITH CHECK (
    auth.is_authenticated() AND 
    auth.can_access_project(project_id) AND
    sender_id = auth.user_id()
  );

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (auth.is_authenticated() AND sender_id = auth.user_id());

-- DIRECT_MESSAGES table policies
CREATE POLICY "Users can view direct messages with their clients"
  ON direct_messages FOR SELECT
  USING (
    auth.is_authenticated() AND EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = direct_messages.client_id
      AND c.created_by = auth.user_id()
    )
  );

CREATE POLICY "Users can send direct messages to their clients"
  ON direct_messages FOR INSERT
  WITH CHECK (
    auth.is_authenticated() AND 
    sender_id = auth.user_id() AND
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = direct_messages.client_id
      AND c.created_by = auth.user_id()
    )
  );

-- TEAM_DIRECT_MESSAGES table policies
CREATE POLICY "Users can view team direct messages"
  ON team_direct_messages FOR SELECT
  USING (
    auth.is_authenticated() AND (
      sender_id = auth.user_id() OR receiver_id = auth.user_id()
    )
  );

CREATE POLICY "Users can send team direct messages"
  ON team_direct_messages FOR INSERT
  WITH CHECK (
    auth.is_authenticated() AND 
    sender_id = auth.user_id()
  );

-- ONBOARDING_FORMS table policies
CREATE POLICY "Users can view their onboarding forms"
  ON onboarding_forms FOR SELECT
  USING (auth.is_authenticated() AND owner_id = auth.user_id());

CREATE POLICY "Users can manage their onboarding forms"
  ON onboarding_forms FOR ALL
  USING (auth.is_authenticated() AND owner_id = auth.user_id());

-- FORM_SUBMISSIONS table policies
CREATE POLICY "Form owners can view submissions"
  ON form_submissions FOR SELECT
  USING (
    auth.is_authenticated() AND EXISTS (
      SELECT 1 FROM onboarding_forms of
      WHERE of.id = form_submissions.form_id
      AND of.owner_id = auth.user_id()
    )
  );

CREATE POLICY "Project collaborators can view form submissions"
  ON form_submissions FOR SELECT
  USING (auth.is_authenticated() AND auth.can_access_project(project_id));

-- PROJECT_COMMENTS table policies
CREATE POLICY "Users can view comments on accessible projects"
  ON project_comments FOR SELECT
  USING (auth.is_authenticated() AND auth.can_access_project(project_id));

CREATE POLICY "Users can create comments on accessible projects"
  ON project_comments FOR INSERT
  WITH CHECK (
    auth.is_authenticated() AND 
    auth.can_access_project(project_id) AND
    author_id = auth.user_id()
  );

CREATE POLICY "Users can update their own comments"
  ON project_comments FOR UPDATE
  USING (auth.is_authenticated() AND author_id = auth.user_id());

-- NOTIFICATIONS table policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.is_authenticated() AND user_id = auth.user_id());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.is_authenticated() AND user_id = auth.user_id());

-- SUPPORT_TICKETS table policies
CREATE POLICY "Users can view their own support tickets"
  ON support_tickets FOR SELECT
  USING (auth.is_authenticated() AND user_id = auth.user_id());

CREATE POLICY "Users can manage their own support tickets"
  ON support_tickets FOR ALL
  USING (auth.is_authenticated() AND user_id = auth.user_id());

-- SUPPORT_TICKET_MESSAGES table policies
CREATE POLICY "Users can view messages on their tickets"
  ON support_ticket_messages FOR SELECT
  USING (
    auth.is_authenticated() AND EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = support_ticket_messages.ticket_id
      AND st.user_id = auth.user_id()
    )
  );

CREATE POLICY "Users can send messages on their tickets"
  ON support_ticket_messages FOR INSERT
  WITH CHECK (
    auth.is_authenticated() AND 
    sender_id = auth.user_id() AND
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = support_ticket_messages.ticket_id
      AND st.user_id = auth.user_id()
    )
  );

-- ASSETS table policies
CREATE POLICY "Users can view their own assets"
  ON assets FOR SELECT
  USING (auth.is_authenticated() AND owner_id = auth.user_id());

CREATE POLICY "Users can manage their own assets"
  ON assets FOR ALL
  USING (auth.is_authenticated() AND owner_id = auth.user_id());

CREATE POLICY "Users can view project assets they can access"
  ON assets FOR SELECT
  USING (
    auth.is_authenticated() AND 
    project_id IS NOT NULL AND 
    auth.can_access_project(project_id)
  );

-- PROJECT_TASKS table policies
CREATE POLICY "Users can view tasks on accessible projects"
  ON project_tasks FOR SELECT
  USING (auth.is_authenticated() AND auth.can_access_project(project_id));

CREATE POLICY "Project owners can manage tasks"
  ON project_tasks FOR ALL
  USING (
    auth.is_authenticated() AND 
    auth.get_project_owner(project_id) = auth.user_id()
  );

CREATE POLICY "Assigned users can update their tasks"
  ON project_tasks FOR UPDATE
  USING (
    auth.is_authenticated() AND (
      assigned_to = auth.user_id() OR
      auth.get_project_owner(project_id) = auth.user_id()
    )
  );

-- PROJECT_DESIGNS table policies
CREATE POLICY "Users can view designs on accessible projects"
  ON project_designs FOR SELECT
  USING (auth.is_authenticated() AND auth.can_access_project(project_id));

CREATE POLICY "Users can manage designs on accessible projects"
  ON project_designs FOR ALL
  USING (auth.is_authenticated() AND auth.can_access_project(project_id));

-- DESIGN_COMMENTS table policies
CREATE POLICY "Users can view design comments on accessible projects"
  ON design_comments FOR SELECT
  USING (
    auth.is_authenticated() AND EXISTS (
      SELECT 1 FROM project_designs pd
      WHERE pd.id = design_comments.design_id
      AND auth.can_access_project(pd.project_id)
    )
  );

CREATE POLICY "Users can create design comments on accessible projects"
  ON design_comments FOR INSERT
  WITH CHECK (
    auth.is_authenticated() AND 
    author_id = auth.user_id() AND
    EXISTS (
      SELECT 1 FROM project_designs pd
      WHERE pd.id = design_comments.design_id
      AND auth.can_access_project(pd.project_id)
    )
  );

CREATE POLICY "Users can update their own design comments"
  ON design_comments FOR UPDATE
  USING (auth.is_authenticated() AND author_id = auth.user_id());