-- Assign Roles to Test Users
-- Run this AFTER creating the test users in Supabase Auth

-- First, let's see what users we have
SELECT 'Current users:' as info;
SELECT email, id as supabase_id FROM auth.users;

-- Assign admin role (replace with actual supabase_id from admin user)
-- You'll need to replace 'ADMIN_SUPABASE_ID' with the actual UUID from auth.users
INSERT INTO user_roles (user_id, organization_id, role, permissions) 
SELECT u.id, 1, 'admin', '[]'::jsonb
FROM users u 
WHERE u.email = 'admin@funnelportals.com'
ON CONFLICT (user_id, organization_id, role) DO NOTHING;

-- Assign team member role
INSERT INTO user_roles (user_id, organization_id, role, permissions) 
SELECT u.id, 1, 'team_member', '[]'::jsonb
FROM users u 
WHERE u.email = 'team@funnelportals.com'
ON CONFLICT (user_id, organization_id, role) DO NOTHING;

-- Assign client role
INSERT INTO user_roles (user_id, organization_id, role, permissions) 
SELECT u.id, 1, 'client', '[]'::jsonb
FROM users u 
WHERE u.email = 'client@funnelportals.com'
ON CONFLICT (user_id, organization_id, role) DO NOTHING;

-- Verify roles were assigned
SELECT 'Role assignments:' as info;
SELECT 
    u.email,
    u.name,
    ur.role,
    o.name as organization
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN organizations o ON ur.organization_id = o.id
ORDER BY ur.role;

SELECT 'Setup complete! You can now test authentication with different roles.' as message;