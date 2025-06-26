# 🚀 FunnelHQ 360 - Production Deployment Plan

## **Phase 1: Switch to Production Database** ⚡ CRITICAL

### **Current Issue**
- Using `MemStorage()` in `server/storage.ts` - **data resets on restart**
- Need to switch to persistent Supabase database

### **Step 1.1: Apply Database Migrations**
```bash
# Navigate to project directory
cd "/Users/home/Documents/FunnelHQ TEST"

# Check if Supabase CLI is installed
supabase --version

# If not installed:
npm install -g supabase

# Login to Supabase
supabase login

# Link to your existing project
supabase link --project-ref ptlahrhzavhekjvtyfud

# Apply all migrations to production database
supabase db push

# Verify tables were created
supabase db status
```

### **Step 1.2: Create Production Storage Implementation**
Create `server/supabase-storage.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { IStorage } from './storage'

export class SupabaseStorage implements IStorage {
  private supabase

  constructor() {
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  // Implement all IStorage methods using Supabase client
  async getUsers() {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
    
    if (error) throw error
    return data || []
  }

  async createClient(client: InsertClient) {
    const { data, error } = await this.supabase
      .from('clients')
      .insert([client])
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // ... implement all other methods
}
```

### **Step 1.3: Update Storage Import**
Modify `server/storage.ts`:

```typescript
// Replace the export at the bottom:
// export const storage = new MemStorage();

// With:
import { SupabaseStorage } from './supabase-storage';
export const storage = process.env.NODE_ENV === 'production' 
  ? new SupabaseStorage() 
  : new MemStorage();
```

## **Phase 2: Production Environment Setup** 🔧

### **Step 2.1: Create Production Environment File**
```bash
# Create production environment
cp .env .env.production

# Edit .env.production:
NODE_ENV=production
APP_BETA=false

# Update Clerk keys to production keys when ready
VITE_CLERK_PUBLISHABLE_KEY=pk_live_... # Get from Clerk dashboard
CLERK_SECRET_KEY=sk_live_...          # Get from Clerk dashboard

# Supabase is already configured for production
VITE_SUPABASE_URL=https://ptlahrhzavhekjvtyfud.supabase.co
DATABASE_URL=postgresql://postgres:Iamthebest@30@db.ptlahrhzavhekjvtyfud.supabase.co:5432/postgres
```

### **Step 2.2: Build for Production**
```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start in production mode
NODE_ENV=production npm start
```

## **Phase 3: Deploy to Production Platform** 🌐

### **Option A: Deploy to Vercel (Recommended)**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - All variables from .env.production
# - Ensure DATABASE_URL is set correctly
```

### **Option B: Deploy to Railway**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

### **Option C: Deploy to DigitalOcean App Platform**
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set run command: `npm start`
4. Add all environment variables

## **Phase 4: Comprehensive Production Testing Plan** 🧪

### **Step 4.1: Database Persistence Testing**
```bash
# Test Script - Save as test-production.sh
#!/bin/bash

echo "=== Testing Production Data Flow ==="

# Test 1: Create a client
echo "Creating test client..."
curl -X POST https://your-domain.com/api/clients \
  -H "Content-Type: application/json" \
  -d '{"name":"Production Test Client","email":"test-prod@example.com","organizationId":1,"createdBy":1}'

# Test 2: Verify persistence after restart
echo "Restarting server..."
# Restart your production server

echo "Checking if client persisted..."
curl https://your-domain.com/api/clients | jq '.[] | select(.name == "Production Test Client")'

# Test 3: Create project
echo "Creating test project..."
curl -X POST https://your-domain.com/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Production Test Project",
    "description":"Testing production data flow",
    "clientId":1,
    "organizationId":1,
    "ownerId":1,
    "createdBy":1,
    "budget":"5000"
  }'

# Test 4: Complex workflow test
echo "Testing complete workflow..."
# Add more complex tests here
```

### **Step 4.2: Authentication Flow Testing**
1. **User Registration**
   - Sign up new user
   - Verify user created in Supabase `users` table
   - Test Clerk webhook triggers

2. **User Login**
   - Login with credentials
   - Verify JWT token contains correct claims
   - Test protected routes access

3. **Role-Based Access**
   - Test admin vs team member vs client access
   - Verify RLS policies working

### **Step 4.3: Data Flow Monitoring Setup**
Create monitoring dashboard to track:

```typescript
// Add to your API routes for monitoring
app.use('/api/*', (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    body: req.body,
    user: req.user?.id,
    timestamp: Date.now()
  });
  next();
});

// Add response time tracking
app.use('/api/*', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`API Response: ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});
```

## **Phase 5: Production Monitoring & Debugging** 📊

### **Step 5.1: Set Up Logging**
```typescript
// Add to server/index.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});

// Use throughout application
logger.info('Database operation', { operation: 'create_client', clientId: client.id });
```

### **Step 5.2: Health Check Endpoints**
```typescript
// Add to routes.ts
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const dbCheck = await storage.getUsers();
    
    // Test Supabase connection
    const supabaseCheck = await supabase.from('users').select('count');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      supabase: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/debug/data-flow', async (req, res) => {
  const stats = {
    totalUsers: await storage.getUsers().then(u => u.length),
    totalClients: await storage.getClients().then(c => c.length),
    totalProjects: await storage.getProjects().then(p => p.length),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version
  };
  
  res.json(stats);
});
```

## **Phase 6: Real-World Testing Scenarios** 🌍

### **Test Case 1: Complete Client Onboarding**
1. Admin creates client
2. Client receives invitation
3. Client logs in and completes profile
4. Admin assigns project
5. Client can view project dashboard
6. **Verify each step persists in database**

### **Test Case 2: Project Collaboration**
1. Admin creates project
2. Assigns team members
3. Team members receive notifications
4. Team creates tasks
5. Client can comment on tasks
6. **Verify all interactions stored and retrievable**

### **Test Case 3: Billing & Subscription**
1. User signs up (starts trial)
2. Creates projects (test limits)
3. Upgrades subscription
4. Limits should update
5. **Verify billing data persists**

### **Test Case 4: File Upload & Storage**
1. Upload assets to projects
2. Share with clients
3. Client downloads files
4. **Verify Supabase storage integration**

## **Phase 7: Performance & Scale Testing** ⚡

### **Load Testing Script**
```bash
# Install artillery for load testing
npm install -g artillery

# Create load-test.yml
target: 'https://your-domain.com'
phases:
  - duration: 60
    arrivalRate: 10
scenarios:
  - name: "API Load Test"
    requests:
      - get:
          url: "/api/stats"
      - post:
          url: "/api/clients"
          json:
            name: "Load Test Client"
            email: "load-test@example.com"

# Run load test
artillery run load-test.yml
```

## **Phase 8: Go-Live Checklist** ✅

### **Pre-Launch**
- [ ] Database migrations applied
- [ ] All environment variables configured
- [ ] Clerk webhooks pointing to production
- [ ] SSL certificate configured
- [ ] Domain name configured
- [ ] Monitoring tools active
- [ ] Backup strategy implemented

### **Launch Day**
- [ ] Deploy to production
- [ ] Run smoke tests
- [ ] Monitor error logs
- [ ] Test critical user flows
- [ ] Monitor performance metrics
- [ ] Validate data persistence

### **Post-Launch Monitoring**
- [ ] Set up alerts for errors
- [ ] Monitor API response times
- [ ] Track user adoption
- [ ] Monitor database performance
- [ ] Regular backup verification

## **Immediate Next Steps** 🎯

1. **Apply database migrations** ⚡ URGENT
2. **Switch to SupabaseStorage** ⚡ URGENT
3. **Test locally with production database**
4. **Deploy to staging environment**
5. **Run comprehensive test suite**
6. **Deploy to production**

This plan ensures your production deployment has persistent data, proper monitoring, and comprehensive testing to verify all flows work correctly in the real world.