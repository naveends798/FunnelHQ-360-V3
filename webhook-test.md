# Webhook Configuration Guide

## Current Issues
1. Organization onboarding screen disappears immediately ✅ FIXED
2. No organization created in Clerk platform
3. Webhook not firing for user.created events

## Fixed Issues
- ✅ Removed conflicting timeout in useOrganization hook
- ✅ Added delay in organization onboarding to prevent race conditions  
- ✅ Auto-advance to organization creation form
- ✅ Enhanced debugging and error handling
- ✅ Removed hardcoded organizationId from signup

## Current Workflow
1. User signs up → Clerk account created with admin role
2. App waits 2 seconds for webhook to create organization
3. If no organization found → Shows organization creation form
4. User can manually create organization
5. Organization created in both Clerk and database

## Webhook Configuration Needed

### 1. Clerk Dashboard Webhook Setup
- **URL**: `https://your-domain.com/api/clerk/webhooks`
- **Events**: `user.created`, `organization.created`, `organizationMembership.created`
- **Secret**: Set `CLERK_WEBHOOK_SECRET` environment variable

### 2. Environment Variables
```bash
CLERK_WEBHOOK_SECRET=your_webhook_secret_from_clerk
API_BASE_URL=https://your-domain.com  # For production
```

### 3. Test Webhook Endpoint
Visit: `/api/clerk/webhooks` to test if webhook endpoint is accessible

## Testing Steps
1. Sign up with a new email
2. Wait 2 seconds on onboarding screen
3. Should auto-advance to organization creation form
4. Fill in organization name and create
5. Should redirect to dashboard
6. Check Clerk dashboard for organization

## Next Steps
- Configure webhooks in Clerk dashboard
- Test with new signup
- Verify organization creation in both Clerk and database