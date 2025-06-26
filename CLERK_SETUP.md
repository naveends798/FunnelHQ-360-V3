# Clerk Setup Instructions for FunnelHQ 360

## Prerequisites
1. Create a Clerk account at https://clerk.com
2. Create a new application in the Clerk Dashboard

## Configuration Steps

### 1. Get Your API Keys
1. Go to your Clerk Dashboard
2. Navigate to "API Keys" section
3. Copy the following keys:
   - **Publishable Key**: Starts with `pk_test_` or `pk_live_`
   - **Secret Key**: Starts with `sk_test_` or `sk_live_`

### 2. Set Environment Variables
Create a `.env.local` file in the project root:
```bash
VITE_CLERK_PUBLISHABLE_KEY=your_publishable_key_here
CLERK_SECRET_KEY=your_secret_key_here
```

### 3. Enable Authentication Methods
In your Clerk Dashboard, go to "User & Authentication" → "Email, Phone, Username":

1. **Email Authentication**:
   - ✅ Enable "Email address"
   - ✅ Enable "Email verification code" (for magic links)
   - ✅ Enable "Password"

2. **Phone Authentication** (Optional):
   - ✅ Enable "Phone number"
   - ✅ Enable "SMS verification code" (for OTP)

3. **Social Logins**:
   - Navigate to "Social Connections"
   - Enable Google, GitHub, or other providers as needed

### 4. Configure Email Templates
1. Go to "Email Templates" in Clerk Dashboard
2. Customize the following templates:
   - **Sign up**: Welcome email for new users
   - **Magic link**: Email with sign-in link
   - **Verification code**: Email with OTP code

### 5. Enable Organizations (Multi-tenancy)
1. Go to "Organizations" in Clerk Dashboard
2. Enable "Organizations" feature by toggling it ON
3. Configure Organization Settings:
   - ✅ **Allow users to create organizations**: Enable
   - ✅ **Allow organization invitations**: Enable
   - ✅ **Require organizations**: Optional (if enabled, users must join an org)
   - ✅ **Maximum organizations per user**: Set to unlimited or specific number
   - ✅ **Default role for new members**: Set to "member"

4. Organization Roles Configuration:
   - Click on "Roles" tab
   - Create the following roles:
     - **admin**: Full organization management
     - **member**: Standard member permissions
   - Set permissions for each role as needed

5. Organization Profile Fields:
   - Add custom metadata fields:
     - `plan`: String (pro_trial, solo, pro)
     - `trialEndsAt`: DateTime
     - `createdAt`: DateTime

6. Organization Creation Flow:
   - The app auto-creates an organization on first sign-up
   - Default plan is "pro_trial" with 14-day expiration
   - Users can create additional organizations
   - Organization switcher is available in the sidebar

### 6. Configure Organization Invitations

1. **Enable Invitations**:
   - In Organizations settings, ensure "Allow organization invitations" is enabled
   - Set invitation expiry time (default: 7 days)
   - Configure invitation email template

2. **Invitation Email Template**:
   Go to "Email Templates" → "Organization invitation":
   ```
   Subject: You've been invited to join {{organization.name}} on FunnelHQ 360
   
   Body: 
   {{inviter.firstName}} has invited you to join {{organization.name}} as a {{invitation.role}}.
   
   Click the link below to accept:
   {{invitation.url}}
   
   This invitation expires in 7 days.
   ```

3. **Invitation Flow**:
   - Admin invites user via email
   - User receives email with invitation link
   - Link redirects to `/signup?__clerk_invitation_token=XXX`
   - After signup/login, user is added to organization
   - User sees success page and joins organization

4. **Role Assignment**:
   - Invitations include role (admin, team_member, client)
   - Role is stored in organization membership
   - App reads role for permissions

### 6. Configure Roles & Permissions

#### User Metadata Structure
The application uses Clerk's metadata to store user and organization data:

**User Public Metadata:**
```json
{
  "role": "admin", // Default role when not in organization
  "onboardingCompleted": false,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**User Private Metadata:**
```json
{
  "internalNotes": "",
  "flags": []
}
```

**Organization Public Metadata:**
```json
{
  "plan": "pro_trial", // pro_trial, solo, pro
  "trialEndsAt": "2024-01-15T00:00:00Z",
  "createdAt": "2024-01-01T00:00:00Z",
  "features": {
    "maxProjects": -1, // -1 for unlimited
    "maxStorage": 107374182400, // bytes
    "maxTeamMembers": -1
  }
}
```

**Organization Private Metadata:**
```json
{
  "stripeCustomerId": null,
  "subscriptionId": null,
  "billingEmail": null
}
```

#### Role Mapping
- Organization membership roles → App roles:
  - `admin` → `admin` (full access)
  - `member` → `team_member` (project access)
  - `client` → `client` (read-only)
- User metadata `role` is fallback when not in organization

### 7. Webhook Configuration (For Phase 1 Step 7)
Will be configured later for:
- `user.created` - To sync with Supabase
- `organization.member.created` - To handle invitations

## Testing Authentication

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:5173/signup

3. Test signup methods:
   - Email + Password
   - Magic link (click "Sign in with email link")
   - OTP (if phone enabled)
   - Social login (Google)

4. After signup, you should be redirected to the dashboard

## 9. Client-Side Route Protection

### Available Hooks

1. **`useRouteGuard`** - Main hook for route protection
   ```typescript
   const { isLoading, isAuthorized, currentRole } = useRouteGuard({
     requireAuth: true,
     requiredRole: 'admin',
     requiredPermission: 'projects:create',
     redirectTo: '/login'
   });
   ```

2. **`usePlanFeatures`** - Check plan limits and features
   ```typescript
   const { 
     currentPlan,
     checkFeature,
     checkLimit,
     canInviteMembers 
   } = usePlanFeatures();
   ```

3. **`useTrialStatus`** - Monitor trial expiration
   ```typescript
   const { 
     isTrialExpired,
     daysLeft,
     showUpgradeBanner 
   } = useTrialStatus();
   ```

### Route Protection Components

1. **`<RouteGuard>`** - Wrap protected content
   ```tsx
   <RouteGuard requiredRole="admin">
     <AdminOnlyContent />
   </RouteGuard>
   ```

2. **`<ClerkProtectedRoute>`** - Simplified protection
   ```tsx
   <ClerkProtectedRoute requiresPermission="billing:view">
     <BillingPage />
   </ClerkProtectedRoute>
   ```

3. **`<TrialBanner>`** - Auto-shows trial warnings
   ```tsx
   <TrialBanner /> // Place in dashboard/main layout
   ```

## Troubleshooting

### Common Issues:

1. **"Missing VITE_CLERK_PUBLISHABLE_KEY"**
   - Ensure `.env.local` file exists
   - Restart the dev server after adding env vars

2. **Magic links not working**
   - Check email template configuration
   - Verify email provider settings in Clerk

3. **Social login fails**
   - Ensure OAuth app is properly configured
   - Check redirect URLs match your domain

4. **Users not redirected after login**
   - Check `afterSignInUrl` in login component
   - Verify route protection logic