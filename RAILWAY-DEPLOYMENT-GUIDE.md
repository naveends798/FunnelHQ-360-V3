# 🚀 FunnelHQ 360 - Railway Deployment Guide

## Simple Step-by-Step Deployment (Non-Developer Friendly)

### Prerequisites
- [ ] GitHub account (free)
- [ ] Railway account (free tier available) - Sign up at railway.app
- [ ] Supabase project with database configured
- [ ] Clerk account with production keys

---

## 🔧 **Step 1: Prepare Your Railway Account**

### 1.1 Sign up for Railway
1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Connect with GitHub account
4. Verify your email

---

## 📤 **Step 2: Deploy Your Application**

### 2.1 Deploy from GitHub (Recommended)
1. In Railway dashboard, click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your FunnelHQ repository
4. Railway will automatically detect it's a Node.js project
5. Click "Deploy Now"

**That's it! Railway automatically:**
- Installs dependencies (`npm install`)
- Builds your app (`npm run build`)
- Starts your server (`npm run start`)

---

## ⚙️ **Step 3: Configure Environment Variables**

### 3.1 In Railway Dashboard
1. Go to your project
2. Click "Variables" tab
3. Add these variables (get values from `.env.railway.template`):

**Authentication Variables:**
```
VITE_CLERK_PUBLISHABLE_KEY = pk_live_YOUR_CLERK_KEY
CLERK_SECRET_KEY = sk_live_YOUR_CLERK_SECRET
CLERK_WEBHOOK_SECRET = whsec_YOUR_WEBHOOK_SECRET
```

**Database Variables:**
```
VITE_SUPABASE_URL = https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY = eyJ...YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY = eyJ...YOUR_SERVICE_KEY
DATABASE_URL = postgresql://postgres:pass@db.project.supabase.co:5432/postgres
```

**Application Variables:**
```
NODE_ENV = production
APP_BETA = false
```

### 3.2 Where to Get These Values

**Clerk Keys:**
1. Go to [clerk.com](https://clerk.com) dashboard
2. Select your project
3. Go to "API Keys"
4. Copy the production keys

**Supabase Keys:**
1. Go to [supabase.com](https://supabase.com) dashboard
2. Select your project
3. Go to "Settings" > "API"
4. Copy URL and anon key
5. Copy service role key (keep this secret!)

---

## 🌐 **Step 4: Domain Configuration**

### 4.1 Your App URL
Railway automatically provides a URL like: `https://your-project-name.up.railway.app`

### 4.2 Custom Domain (Optional)
1. Go to project settings
2. Click "Domains"
3. Add your custom domain
4. Follow DNS setup instructions

---

## ✅ **Step 5: Verify Deployment**

### 5.1 Check Deployment Status
1. In Railway dashboard, check "Deployments" tab
2. Ensure latest deployment shows "Success"
3. Click on the deployment URL to test

### 5.2 Test Your Application
1. Visit your Railway app URL
2. Test login with Clerk
3. Verify database connection
4. Test all user roles (admin, team_member, client)

---

## 🔍 **Step 6: Monitoring & Troubleshooting**

### 6.1 View Logs
1. In Railway dashboard, click "Logs" tab
2. View real-time application logs
3. Check for any errors

### 6.2 Common Issues & Solutions

**Issue: "Build failed"**
- Solution: Check logs for specific error
- Ensure all dependencies are in package.json

**Issue: "Environment variable not found"**
- Solution: Double-check all environment variables are set
- Redeploy after adding variables

**Issue: "Database connection failed"**
- Solution: Verify DATABASE_URL and Supabase keys
- Check if Supabase project is active

**Issue: "Authentication not working"**
- Solution: Verify Clerk keys are production keys
- Update Clerk dashboard with Railway domain

---

## 🔄 **Automatic Deployments**

Railway automatically redeploys when you:
1. Push code to your main branch
2. Update environment variables
3. Manual redeploy from dashboard

---

## 📋 **Deployment Checklist**

- [ ] Railway account created
- [ ] GitHub repository connected
- [ ] Project deployed successfully
- [ ] All environment variables configured
- [ ] Application loads at Railway URL
- [ ] Login/authentication working
- [ ] Database connection successful
- [ ] All user roles working correctly
- [ ] No errors in deployment logs

---

## 💰 **Railway Pricing (As of 2024)**

**Hobby Plan (Free):**
- $5 free credits monthly
- Perfect for development and small projects

**Pro Plan ($20/month):**
- Unlimited usage
- Better performance
- Priority support

---

## 🆘 **Getting Help**

If you encounter issues:
1. Check Railway deployment logs
2. Verify all environment variables
3. Test locally first
4. Railway Discord community: discord.gg/railway
5. Railway documentation: docs.railway.app

---

## 🎯 **Why Railway vs Vercel for This Project?**

✅ **Railway Advantages:**
- Simpler for full-stack apps
- Automatic database support
- Real-time WebSocket support
- Single service deployment
- Easier environment management

❌ **Vercel Limitations:**
- Complex setup for full-stack
- Serverless functions only
- Limited WebSocket support
- Requires separate API routing

---

**Deployment completed successfully! 🎉**

Your FunnelHQ 360 application is now live on Railway with:
- ✅ Full-stack deployment
- ✅ Persistent database storage  
- ✅ Role-based access control
- ✅ Secure authentication
- ✅ Real-time communication system
- ✅ Automatic deployments