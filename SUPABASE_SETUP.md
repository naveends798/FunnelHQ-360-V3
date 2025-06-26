# Supabase Setup Guide for FunnelHQ 360

## Step 1: Create New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in/sign up
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `funnelhq-360`
   - **Database Password**: Generate a secure password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Start with Free tier
5. Click "Create new project"
6. Wait for project to be created (2-3 minutes)

## Step 2: Configure JWT Secret for Clerk Integration

### Get Your Clerk JWT Signing Key
1. Go to your [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **Configure** → **JWT Templates**
4. Click "New template" if none exists, or edit existing
5. Template name: `supabase`
6. Copy the **JWT verification key** (starts with `-----BEGIN PUBLIC KEY-----`)

### Configure Supabase JWT Settings
1. In your Supabase project dashboard
2. Go to **Settings** → **API**
3. Scroll down to **JWT Settings**
4. Replace the **JWT Secret** with your Clerk JWT verification key
5. Click **Save**

## Step 3: Get Supabase Credentials

From your Supabase project dashboard → **Settings** → **API**:

- **Project URL**: `https://[your-project-id].supabase.co`
- **anon (public) key**: `eyJ...` (for client-side access)
- **service_role key**: `eyJ...` (for server-side admin access)

## Step 4: Update Environment Variables

Add these to your `.env` file:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://[your-project-id].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# Database URL for direct connections (if needed)
DATABASE_URL=postgresql://postgres:[your-password]@db.[your-project-id].supabase.co:5432/postgres
```

## Step 5: Install Supabase Dependencies

Run this command in your project root:

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-react
```

## Step 6: Clerk JWT Template Configuration

In your Clerk dashboard, create/edit the JWT template with these claims:

```json
{
  "aud": "authenticated",
  "exp": "{{date.now_plus_duration('1 hour')}}",
  "iat": "{{date.now}}",
  "iss": "https://[your-clerk-domain]",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address.email_address}}",
  "user_metadata": {
    "full_name": "{{user.full_name}}",
    "first_name": "{{user.first_name}}",
    "last_name": "{{user.last_name}}",
    "company_name": "{{user.public_metadata.companyName}}",
    "company_role": "{{user.public_metadata.companyRole}}",
    "subscription_plan": "{{user.public_metadata.subscriptionPlan}}",
    "subscription_status": "{{user.public_metadata.subscriptionStatus}}"
  },
  "app_metadata": {
    "clerk_user_id": "{{user.id}}"
  },
  "role": "authenticated"
}
```

## Verification Steps

After setup, verify the integration:

1. **Test Connection**: Run `npm run dev` and check browser console for Supabase connection
2. **JWT Validation**: Check that Clerk tokens are accepted by Supabase
3. **User Authentication**: Verify user data flows from Clerk to Supabase

## Next Steps

Once this setup is complete, you'll be ready to:
- Create the database schema
- Set up Row Level Security (RLS) policies
- Implement API endpoints
- Configure storage buckets

## Troubleshooting

### Common Issues:
- **JWT verification failed**: Double-check the JWT signing key is correctly copied
- **CORS errors**: Ensure Supabase project URL is correct in environment variables
- **Authentication errors**: Verify Clerk JWT template includes required claims

### Support:
- [Supabase Documentation](https://supabase.com/docs)
- [Clerk + Supabase Integration Guide](https://clerk.com/docs/integrations/databases/supabase)