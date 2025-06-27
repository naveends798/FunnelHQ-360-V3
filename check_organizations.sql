-- Check if organizations table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'organizations'
);

-- If it exists, show its structure
\d organizations;

-- Check organization_memberships table
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'organization_memberships'
);