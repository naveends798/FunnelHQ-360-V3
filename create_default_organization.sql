-- Create default organization with ID 1
-- Run this in your Supabase SQL editor

INSERT INTO organizations (
  id,
  clerk_org_id,
  name,
  slug,
  plan,
  trial_ends_at,
  subscription_status,
  max_members,
  max_projects,
  max_storage,
  storage_used,
  created_by,
  created_at,
  updated_at
) VALUES (
  1,
  'org_default',
  'Default Organization',
  'default',
  'pro_trial',
  NOW() + INTERVAL '30 days',
  'active',
  -1,
  -1,
  107374182400,
  0,
  'user_default',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Reset the sequence to start from 2 for future organizations
SELECT setval('organizations_id_seq', 2, false);