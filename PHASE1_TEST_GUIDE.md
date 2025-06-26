# Phase 1 Testing Guide - Step by Step

## Prerequisites

### 1. Set Up Clerk Account
1. Go to https://clerk.com and create a free account
2. Create a new application in Clerk Dashboard
3. Choose a name like "FunnelHQ 360 Test"

### 2. Configure Clerk Dashboard

#### Enable Authentication Methods:
1. Go to **User & Authentication** → **Email, Phone, Username**
2. Enable:
   - ✅ Email address
   - ✅ Password
   - ✅ Email verification code (for magic links)
   - ✅ Email verification link

#### Enable Organizations:
1. Go to **Organizations** in sidebar
2. Toggle **Enable organizations** to ON
3. Configure:
   - ✅ Allow users to create organizations
   - ✅ Allow organization invitations
   - ✅ Members can delete their own account

#### Configure Social Login (Optional):
1. Go to **User & Authentication** → **Social Connections**
2. Enable Google (or other providers)
3. Follow OAuth setup instructions

### 3. Get Your API Keys
1. Go to **API Keys** in Clerk Dashboard
2. Copy:
   - Publishable Key (starts with `pk_`)
   - Secret Key (starts with `sk_`)

### 4. Set Up Environment Variables
Create `.env.local` file in project root:
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
DATABASE_URL=your_database_url_here
NODE_ENV=development
```

### 5. Start the Application
```bash
npm run dev
```

---

## Testing Steps

### Step 1: Test Sign Up Flow

1. **Navigate to Sign Up**
   - Open http://localhost:5173
   - You should be redirected to `/login`
   - Click "Sign up" link to go to `/signup`

2. **Test Email + Password Sign Up**
   - Enter email: `test1@example.com`
   - Enter password: `TestPassword123!`
   - Enter first name: `Test`
   - Enter last name: `User`
   - Click "Sign up"

3. **Verify Email**
   - Check your email for verification code
   - Enter the code in the verification screen
   - You should be redirected to dashboard

4. **Check Initial Setup**
   - ✅ Organization should be auto-created ("My Organization")
   - ✅ You should have admin role
   - ✅ Pro Trial plan should be active (14 days)
   - ✅ Organization switcher should appear in sidebar

### Step 2: Test Magic Link Sign In

1. **Sign Out**
   - Click your profile in sidebar
   - Click "Sign out"

2. **Test Magic Link**
   - On login page, click "Sign in with email link"
   - Enter: `test1@example.com`
   - Check email for magic link
   - Click the link
   - You should be logged in automatically

### Step 3: Test Organization Features

1. **Create New Organization**
   - Click organization switcher in sidebar
   - Click "Create Organization"
   - Enter name: "Test Company"
   - Click "Create Organization"
   - Verify it switches to new org
   - Check that it has Pro Trial plan

2. **Switch Between Organizations**
   - Click organization switcher
   - Select "My Organization"
   - Verify UI updates
   - Switch back to "Test Company"

### Step 4: Test Invitation Flow

1. **Send Team Invitation**
   - Go to Team page (from sidebar)
   - Click "Invite Member"
   - Enter email: `teammate@example.com`
   - Select role: "Team Member"
   - Click "Send Invitation"
   - Check invitation appears in list

2. **Test Invitation Accept** (use incognito/different browser)
   - Check `teammate@example.com` inbox
   - Click invitation link
   - Create account if needed
   - Verify you join the organization
   - Check role is "Team Member"

### Step 5: Test Role-Based Access

1. **As Admin** (test1@example.com):
   - ✅ Can access all pages
   - ✅ Can see Team page
   - ✅ Can see Billing page
   - ✅ Can invite members

2. **As Team Member** (teammate@example.com):
   - ✅ Redirected to Projects page (not Dashboard)
   - ❌ Cannot access Team page
   - ❌ Cannot access Billing page
   - ✅ Can access Projects, Tasks

3. **Test Client Role**:
   - As admin, invite `client@example.com` with "Client" role
   - Login as client
   - ✅ Should see Client Dashboard
   - ❌ Cannot access admin areas

### Step 6: Test Trial Expiration

1. **Simulate Expired Trial** (requires database access or API):
   - Update organization metadata to set `trialEndsAt` to yesterday
   - Refresh the page
   - ✅ Should see trial expired banner
   - ✅ Should be redirected to `/billing`
   - ✅ Can only access `/billing` and `/support`

### Step 7: Test Protected Routes

1. **Test Unauthenticated Access**:
   - Sign out completely
   - Try to access http://localhost:5173/dashboard
   - ✅ Should redirect to `/login`

2. **Test Permission-Based Routes**:
   - As team member, try accessing:
     - `/team` → Should redirect to `/projects`
     - `/billing` → Should redirect to `/projects`
     - `/settings` → Should show (personal settings only)

### Step 8: Test Data Persistence

1. **Check Metadata Storage**:
   - Go to Settings page (as admin)
   - Verify user metadata shows:
     - Role: admin
     - Organization plan: pro_trial
     - Trial end date

2. **Test Across Sessions**:
   - Sign out and sign back in
   - Verify all settings persist
   - Organization membership maintained
   - Role preserved

---

## Verification Checklist

### Authentication
- [ ] Sign up with email/password works
- [ ] Email verification required
- [ ] Magic link sign in works
- [ ] Sign out works
- [ ] Session persists on refresh

### Organizations
- [ ] Auto-creates org on first sign up
- [ ] Can create additional organizations
- [ ] Can switch between organizations
- [ ] Organization has Pro Trial metadata

### Invitations
- [ ] Admin can send invitations
- [ ] Email received with invitation link
- [ ] Can accept invitation and join org
- [ ] Correct role assigned

### Role-Based Access
- [ ] Admin sees full dashboard
- [ ] Team member redirected to projects
- [ ] Client sees client dashboard
- [ ] Unauthorized routes redirect properly

### Trial Management
- [ ] Trial banner shows days remaining
- [ ] Expired trial locks features
- [ ] Billing/support accessible during expired trial

### UI/UX
- [ ] Dark theme styling consistent
- [ ] Loading states show properly
- [ ] Error messages clear
- [ ] Mobile responsive

---

## Troubleshooting

### Common Issues:

1. **"Missing VITE_CLERK_PUBLISHABLE_KEY"**
   - Check `.env.local` file exists
   - Restart dev server after adding env vars

2. **Email not received**
   - Check spam folder
   - Verify email settings in Clerk Dashboard
   - Try different email provider

3. **Organization not created**
   - Check browser console for errors
   - Verify Organizations enabled in Clerk
   - Check webhook logs in Clerk Dashboard

4. **Wrong redirect after login**
   - Clear browser localStorage
   - Check role in Clerk Dashboard
   - Verify useAuth hook is working

### Debug Commands:

```javascript
// In browser console:
localStorage.getItem('test_role')  // Check mock role
console.log(window.Clerk)          // Verify Clerk loaded
```

### Next Steps After Testing:
1. Note any issues found
2. Test with real email addresses
3. Test on different devices/browsers
4. Prepare for Phase 2 (Supabase integration)