-- FunnelHQ 360 - Storage Setup
-- User-centric storage buckets with proper access control

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('user-assets', 'user-assets', false, 52428800, ARRAY['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('project-files', 'project-files', false, 104857600, ARRAY['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/*']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/*']),
  ('project-designs', 'project-designs', false, 52428800, ARRAY['image/*'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for user-assets bucket
-- Users can upload to their own folder
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-assets' AND
    auth.is_authenticated() AND
    (storage.foldername(name))[1] = 'user_' || auth.user_id()::text
  );

-- Users can view their own assets
CREATE POLICY "Users can view own assets"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-assets' AND
    auth.is_authenticated() AND
    (storage.foldername(name))[1] = 'user_' || auth.user_id()::text
  );

-- Users can update their own assets
CREATE POLICY "Users can update own assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-assets' AND
    auth.is_authenticated() AND
    (storage.foldername(name))[1] = 'user_' || auth.user_id()::text
  );

-- Users can delete their own assets
CREATE POLICY "Users can delete own assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-assets' AND
    auth.is_authenticated() AND
    (storage.foldername(name))[1] = 'user_' || auth.user_id()::text
  );

-- Storage policies for project-files bucket
-- Project owners and team members can upload files
CREATE POLICY "Project collaborators can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files' AND
    auth.is_authenticated() AND
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = (storage.foldername(name))[2]::integer
      AND (
        p.owner_id = auth.user_id() OR
        EXISTS (
          SELECT 1 FROM project_team_members ptm
          WHERE ptm.project_id = p.id
          AND ptm.user_id = auth.user_id()
          AND ptm.is_active = true
        )
      )
    )
  );

-- Project collaborators can view project files
CREATE POLICY "Project collaborators can view files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-files' AND
    auth.is_authenticated() AND
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = (storage.foldername(name))[2]::integer
      AND (
        p.owner_id = auth.user_id() OR
        EXISTS (
          SELECT 1 FROM project_team_members ptm
          WHERE ptm.project_id = p.id
          AND ptm.user_id = auth.user_id()
          AND ptm.is_active = true
        )
      )
    )
  );

-- Project owners can delete files
CREATE POLICY "Project owners can delete files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-files' AND
    auth.is_authenticated() AND
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = (storage.foldername(name))[2]::integer
      AND p.owner_id = auth.user_id()
    )
  );

-- Storage policies for avatars bucket (public)
-- Anyone authenticated can upload avatars
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.is_authenticated()
  );

-- Anyone can view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Users can update their own avatars
CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.is_authenticated() AND
    (storage.foldername(name))[1] = 'user_' || auth.user_id()::text
  );

-- Users can delete their own avatars
CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.is_authenticated() AND
    (storage.foldername(name))[1] = 'user_' || auth.user_id()::text
  );

-- Storage policies for project-designs bucket
-- Similar to project-files but specifically for design assets
CREATE POLICY "Project collaborators can upload designs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-designs' AND
    auth.is_authenticated() AND
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = (storage.foldername(name))[2]::integer
      AND (
        p.owner_id = auth.user_id() OR
        EXISTS (
          SELECT 1 FROM project_team_members ptm
          WHERE ptm.project_id = p.id
          AND ptm.user_id = auth.user_id()
          AND ptm.is_active = true
        )
      )
    )
  );

CREATE POLICY "Project collaborators can view designs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-designs' AND
    auth.is_authenticated() AND
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = (storage.foldername(name))[2]::integer
      AND (
        p.owner_id = auth.user_id() OR
        EXISTS (
          SELECT 1 FROM project_team_members ptm
          WHERE ptm.project_id = p.id
          AND ptm.user_id = auth.user_id()
          AND ptm.is_active = true
        )
      )
    )
  );

CREATE POLICY "Project owners can delete designs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-designs' AND
    auth.is_authenticated() AND
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = (storage.foldername(name))[2]::integer
      AND p.owner_id = auth.user_id()
    )
  );

-- Helper function to get storage usage for a user
CREATE OR REPLACE FUNCTION get_user_storage_usage(user_id_param INTEGER)
RETURNS BIGINT AS $$
DECLARE
  total_size BIGINT := 0;
  user_folder TEXT;
BEGIN
  user_folder := 'user_' || user_id_param::text;
  
  SELECT COALESCE(SUM(metadata->>'size'::text)::bigint, 0)
  INTO total_size
  FROM storage.objects
  WHERE bucket_id IN ('user-assets', 'avatars')
  AND (storage.foldername(name))[1] = user_folder;
  
  -- Add project files for projects owned by this user
  SELECT total_size + COALESCE(SUM(metadata->>'size'::text)::bigint, 0)
  INTO total_size
  FROM storage.objects so
  JOIN projects p ON p.id = (storage.foldername(so.name))[2]::integer
  WHERE so.bucket_id IN ('project-files', 'project-designs')
  AND p.owner_id = user_id_param;
  
  RETURN total_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check storage quota
CREATE OR REPLACE FUNCTION check_storage_quota(user_id_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan TEXT;
  storage_limit BIGINT;
  current_usage BIGINT;
BEGIN
  -- Get user's subscription plan
  SELECT subscription_plan INTO user_plan
  FROM users
  WHERE id = user_id_param;
  
  -- Set storage limit based on plan
  IF user_plan = 'pro' THEN
    storage_limit := 100 * 1024 * 1024 * 1024; -- 100GB
  ELSE
    storage_limit := 5 * 1024 * 1024 * 1024; -- 5GB
  END IF;
  
  -- Get current usage
  current_usage := get_user_storage_usage(user_id_param);
  
  RETURN current_usage < storage_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;