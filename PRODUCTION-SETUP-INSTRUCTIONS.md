# 🚀 FunnelHQ 360 - Production Deployment Instructions

## Quick Setup Guide for Non-Developers

### Step 1: Prepare Your Environment Variables

1. **Get Clerk Production Keys**:
   - Go to [Clerk Dashboard](https://dashboard.clerk.com)
   - Select your project or create a new one for production
   - Go to "API Keys" section
   - Copy the "Publishable Key" (starts with `pk_live_`)
   - Copy the "Secret Key" (starts with `sk_live_`)

2. **Get Supabase Production Keys**:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to Settings → API
   - Copy the "Project URL" 
   - Copy the "anon public" key
   - Copy the "service_role" key (keep this secret!)

### Step 2: Deploy to Vercel

1. **Install Vercel CLI** (one-time setup):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy the application**:
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables in Vercel**:
   - Go to your Vercel dashboard
   - Select your project
   - Go to Settings → Environment Variables
   - Add all variables from `.env.production` file

### Step 3: Configure Environment Variables

Copy these values to your Vercel environment variables:

| Variable Name | Example Value | Where to Get It |
|---------------|---------------|-----------------|
| `NODE_ENV` | `production` | Set exactly as shown |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_xxxxxxxxx` | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | `sk_live_xxxxxxxxx` | Clerk Dashboard → API Keys |
| `VITE_SUPABASE_URL` | `https://xyz.supabase.co` | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Supabase → Settings → API |

### Step 4: Test Your Deployment

1. **Visit your Vercel URL** (provided after deployment)
2. **Test user registration/login**
3. **Create a test project**
4. **Verify role-based access**

## Troubleshooting

### Common Issues:

1. **Build Fails**: Check environment variables are set correctly
2. **Database Connection Error**: Verify Supabase keys and URL
3. **Authentication Error**: Check Clerk keys and domain settings
4. **File Upload Issues**: Ensure proper file size limits

### Support Resources:

- [Vercel Documentation](https://vercel.com/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

## Security Checklist

- [ ] All production keys are different from development
- [ ] Service role key is kept secret
- [ ] Webhook secrets are configured
- [ ] Database has proper security rules
- [ ] File uploads have size restrictions

## Post-Deployment

After successful deployment:

1. **Update Clerk Domain**: Add your Vercel domain to Clerk allowed domains
2. **Test All User Roles**: Admin, Team Member, Client access
3. **Verify Data Persistence**: Create test data and confirm it survives
4. **Monitor Performance**: Check logs in Vercel dashboard

---

**Need Help?** Refer to the detailed deployment plan in `DEPLOYMENT-PLAN-JUNE-24.md`