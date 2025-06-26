# FunnelHQ 360 - Supabase Deployment Guide

## Phase 2: Supabase Backend Integration - Deployment Steps

This guide provides step-by-step instructions to deploy your Supabase backend with Clerk integration.

## Prerequisites

- Completed Phase 1 (Clerk Integration)
- Node.js 18+ installed
- Git repository set up
- Supabase CLI installed (`npm install -g supabase`)

## Step 1: Create Supabase Project

### 1.1 Sign Up and Create Project
1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in project details:
   - **Name**: `funnelhq-360`
   - **Database Password**: Generate a secure password (save this!)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait 2-3 minutes for setup to complete

### 1.2 Get Project Credentials
From your Supabase dashboard → **Settings** → **API**:
- **Project URL**: `https://[your-project-id].supabase.co`
- **anon key**: `eyJ...` (for client-side access)
- **service_role key**: `eyJ...` (for server-side admin access)

## Step 2: Configure JWT Integration

### 2.1 Get Clerk JWT Template
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **Configure** → **JWT Templates**
4. Click "New Template" or edit existing
5. Template name: `supabase`
6. Use this configuration:

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

### 2.2 Configure Supabase JWT
1. Copy the **JWT verification key** from Clerk (starts with `-----BEGIN PUBLIC KEY-----`)
2. In Supabase dashboard → **Settings** → **API** → **JWT Settings**
3. Replace **JWT Secret** with your Clerk JWT verification key
4. Click **Save**

## Step 3: Update Environment Variables

Add these to your `.env` file:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://[your-project-id].supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Database URL for direct connections
DATABASE_URL=postgresql://postgres:[your-password]@db.[your-project-id].supabase.co:5432/postgres
```

## Step 4: Run Database Migrations

### 4.1 Initialize Supabase Locally
```bash
# In your project root
supabase init
```

### 4.2 Link to Your Project
```bash
supabase link --project-ref [your-project-id]
```

### 4.3 Apply Migrations
```bash
# Apply all migrations
supabase db push

# Or apply them individually:
supabase db push --file supabase/migrations/001_initial_schema.sql
supabase db push --file supabase/migrations/002_rls_policies.sql
supabase db push --file supabase/migrations/003_storage_setup.sql
```

### 4.4 Verify Deployment
```bash
# Check migration status
supabase db status
```

## Step 5: Deploy Edge Functions

### 5.1 Deploy Clerk Webhook Handler
```bash
supabase functions deploy clerk-webhook
```

### 5.2 Set Environment Variables
```bash
# Set required environment variables for edge functions
supabase secrets set SUPABASE_URL="https://[your-project-id].supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

## Step 6: Configure Clerk Webhooks

### 6.1 Add Webhook Endpoint
1. In Clerk Dashboard → **Webhooks**
2. Click "Add Endpoint"
3. **Endpoint URL**: `https://[your-project-id].supabase.co/functions/v1/clerk-webhook`
4. **Events to listen for**:
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `organizationInvitation.accepted`
   - `organizationMembership.created`
   - `organizationMembership.updated`

### 6.2 Get Webhook Secret
1. Copy the webhook signing secret from Clerk
2. Add to your environment variables:
```bash
CLERK_WEBHOOK_SECRET=your_webhook_secret_here
```

## Step 7: Test the Integration

### 7.1 Start Your Application
```bash
npm run dev
```

### 7.2 Test User Flow
1. **Sign up a new user** - should create user in Supabase
2. **Update user profile** - should sync to Supabase
3. **Create a project** - should respect RLS policies
4. **Invite team members** - should work with user-centric model

### 7.3 Verify Database
Check your Supabase dashboard → **Table Editor** to see:
- Users being created in `users` table
- Proper RLS policy enforcement
- Data syncing from Clerk webhooks

## Step 8: Production Deployment

### 8.1 Environment Variables for Production
Ensure these are set in your production environment:

```bash
# Clerk
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase
VITE_SUPABASE_URL=https://[your-project-id].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Database
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
```

### 8.2 Build and Deploy
```bash
# Build the application
npm run build

# Deploy to your hosting platform
# (Vercel, Netlify, etc.)
```

### 8.3 Update Webhook URLs
Update your Clerk webhook endpoint to point to your production URL:
`https://your-domain.com/api/supabase/functions/clerk-webhook`

## Step 9: Monitor and Verify

### 9.1 Check Logs
- **Supabase**: Dashboard → **Logs**
- **Clerk**: Dashboard → **Webhooks** → View delivery logs

### 9.2 Test Production Features
1. User registration and login
2. Project creation and collaboration
3. File uploads and storage
4. Real-time notifications
5. Billing and usage tracking

## Troubleshooting

### Common Issues

1. **JWT verification failed**
   - Double-check the JWT signing key in Supabase settings
   - Ensure Clerk JWT template is correctly configured

2. **RLS policy denying access**
   - Verify JWT contains correct user claims
   - Check that helper functions return expected values

3. **Webhook failures**
   - Check webhook endpoint is publicly accessible
   - Verify webhook secret matches
   - Check Supabase function logs

4. **Database connection issues**
   - Verify connection string format
   - Check database password and project ID
   - Ensure IP allowlisting if applicable

### Support Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Clerk + Supabase Integration Guide](https://clerk.com/docs/integrations/databases/supabase)

## Next Steps

After successful deployment:
1. **Set up monitoring** (error tracking, performance)
2. **Configure backups** (Supabase automatic backups)
3. **Set up CI/CD** for automated deployments
4. **Add environment-specific configurations**
5. **Scale as needed** (upgrade Supabase plan)

Your FunnelHQ 360 application is now fully integrated with Supabase backend! 🎉