# 🚀 FunnelHQ 360 - Production Deployment Instructions

## Step-by-Step Deployment to Netlify

### Prerequisites
- [x] Netlify account (free tier works) - Sign up at netlify.com
- [x] GitHub repository with your code
- [x] Supabase project with database configured
- [x] Clerk account with production keys

---

## 🔧 **Step 1: Prepare Your Netlify Account**

### 1.1 Sign up for Netlify
1. Go to [netlify.com](https://netlify.com)
2. Click "Sign up"
3. Connect with GitHub account
4. Verify your email

---

## 📤 **Step 2: Deploy Your Application**

### 2.1 Deploy from GitHub (Recommended)
1. [x] Push your code to GitHub repository
2. Go to Netlify dashboard
3. Click "New site from Git"
4. Choose GitHub and authorize
5. Select your repository: `FunnelHQ-360-V1`
6. Build settings (auto-detected from netlify.toml):
   - **Build Command**: `npm run build`
   - **Publish Directory**: `client/dist`
   - **Functions Directory**: `netlify/functions`

---

## ⚙️ **Step 3: Configure Environment Variables**

### 3.1 In Netlify Dashboard
1. Go to your site settings
2. Click "Environment variables" (left sidebar)
3. Add the following variables:

**Authentication Variables:**
```
VITE_CLERK_PUBLISHABLE_KEY = pk_test_YOUR_CLERK_PUBLISHABLE_KEY_HERE
CLERK_SECRET_KEY = sk_test_YOUR_CLERK_SECRET_KEY_HERE
CLERK_WEBHOOK_SECRET = whsec_YOUR_CLERK_WEBHOOK_SECRET_HERE
```

**Database Variables:**
```
VITE_SUPABASE_URL = https://ptlahrhzavhekjvtyfud.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGc...YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY = eyJhbGc...YOUR_SERVICE_KEY
```

**Application Variables:**
```
NODE_ENV = production
APP_BETA = false
```

### 3.2 Where to Get These Values
**Values already provided above** - they're in your `.env.netlify.example` file.

---

## 🔗 **Step 4: Configure Clerk Webhook**

### 4.1 Set Up Webhook in Clerk Dashboard
1. Go to [clerk.com](https://clerk.com) dashboard
2. Select your project
3. Go to "Webhooks" section
4. Click "Add Endpoint"
5. **Webhook URL**: `https://YOUR-SITE-NAME.netlify.app/api/webhooks/clerk`
   - Replace `YOUR-SITE-NAME` with your actual Netlify site name
6. **Select Events**:
   - `user.created`
   - `user.updated`
   - `user.deleted`
7. Copy the webhook secret and add it to Netlify environment variables

---

## 🌐 **Step 5: Domain Configuration**

### 5.1 Default Netlify Domain
Your app will be available at: `https://your-site-name.netlify.app`

### 5.2 Custom Domain (Optional)
If you want a custom domain:
1. Go to site settings
2. Click "Domain management"
3. Add your domain
4. Follow DNS configuration instructions

---

## ✅ **Step 6: Verify Deployment**

### 6.1 Check Deployment Status
1. Go to Netlify dashboard
2. Check "Deploys" tab
3. Ensure latest deployment shows "Published"

### 6.2 Test Your Application
1. Visit your production URL
2. Test login with Clerk
3. Verify database connection
4. Test all user roles (admin, team_member, client)
5. Test webhook at `/api/webhooks/clerk`

---

## 🔍 **Step 7: Monitoring & Troubleshooting**

### 7.1 View Logs
1. Go to Netlify dashboard
2. Click "Functions" tab to see serverless function logs
3. Check "Deploy log" for build issues

### 7.2 Common Issues & Solutions

**Issue: "Environment variable not found"**
- Solution: Double-check all environment variables are set correctly
- Make sure to redeploy after adding variables

**Issue: "Database connection failed"**
- Solution: Verify Supabase keys and URL
- Check if Supabase project is active

**Issue: "Authentication not working"**
- Solution: Verify Clerk keys and webhook URL
- Check Clerk dashboard for correct domain settings

**Issue: "Function timeout"**
- Solution: Check function logs for errors
- Verify webhook signature validation

---

## 📋 **Current Status & Next Actions**

### ✅ **Completed Steps:**
- [x] Repository prepared and secrets removed
- [x] Netlify deployment configuration added
- [x] Environment variables template created
- [x] Clerk webhook function implemented
- [x] Build configuration optimized

### 🔄 **Your Next Actions:**
1. **Deploy to Netlify**:
   - Go to netlify.com and create new site from Git
   - Select your GitHub repository
   - Wait for initial deployment

2. **Add Environment Variables**:
   - Use the values provided above
   - Add them one by one in Netlify dashboard

3. **Configure Clerk Webhook**:
   - Get your Netlify site URL after first deployment
   - Add webhook endpoint in Clerk dashboard
   - Test webhook functionality

4. **Final Testing**:
   - Test login/logout functionality
   - Verify database operations
   - Check all user roles work correctly

---

## 🆘 **Getting Help**

If you encounter issues:
1. Check Netlify function logs in dashboard
2. Verify all environment variables are set
3. Test webhook with Clerk dashboard tools
4. Check build logs for any errors

---

**Current Status: Ready for Netlify Deployment! 🎉**

Your FunnelHQ 360 application is configured for production with:
- ✅ Optimized build process
- ✅ Serverless functions for webhooks
- ✅ Environment variables template
- ✅ Security best practices implemented
- ✅ Database and authentication ready