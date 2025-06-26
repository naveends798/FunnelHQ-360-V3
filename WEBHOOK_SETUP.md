# Clerk Webhook Setup

## 1. Generate Webhook Signing Secret

1. Go to your Clerk Dashboard
2. Navigate to **Webhooks** in the left sidebar
3. Click **Add Endpoint**
4. Enter your webhook URL:
   - Development: `https://YOUR_NGROK_URL/api/clerk/webhook`
   - Production: `https://YOUR_DOMAIN/api/clerk/webhook`

## 2. Select Events to Listen For

Enable the following events:

### User Events
- ✅ `user.created` - Initialize user metadata and sync to database
- ✅ `user.updated` - Update user information in database

### Organization Events
- ✅ `organization.created` - Initialize organization with trial plan
- ✅ `organizationMembership.created` - Add user to organization
- ✅ `organizationMembership.updated` - Update user role in organization
- ✅ `organizationMembership.deleted` - Remove user from organization

### Invitation Events
- ✅ `organizationInvitation.created` - Track invitation creation
- ✅ `organizationInvitation.accepted` - Handle invitation acceptance

## 3. Configure Environment Variable

After creating the endpoint, Clerk will show you a signing secret. Add it to your `.env.local`:

```bash
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## 4. Testing Webhooks Locally

### Using ngrok (Recommended)

1. Install ngrok: `npm install -g ngrok`
2. Start your dev server: `npm run dev`
3. In another terminal: `ngrok http 5173`
4. Copy the HTTPS URL from ngrok
5. Update webhook endpoint in Clerk Dashboard

### Using Clerk CLI

1. Install Clerk CLI: `npm install -g @clerk/cli`
2. Login: `clerk login`
3. Forward webhooks: `clerk webhooks:forward --url http://localhost:5173/api/clerk/webhook`

## 5. Webhook Event Handlers

### user.created
- Sets default role as 'admin' for first user
- Initializes user metadata:
  - `role`: Default role when not in organization
  - `onboardingCompleted`: false
  - `createdAt`: Timestamp

### organization.created
- Initializes organization with Pro Trial:
  - `plan`: 'pro_trial'
  - `trialEndsAt`: 14 days from creation
  - `features`: Unlimited projects, 100GB storage, unlimited team

### organizationMembership.created
- Maps Clerk roles to app roles:
  - `admin` → Full access
  - `member` → Team member access
  - `client` → Read-only access

## 6. Testing Webhook Integration

1. Create a new user account
2. Check server logs for: `Received webhook: user.created`
3. Verify user metadata in Clerk Dashboard
4. Create an organization
5. Check server logs for: `Received webhook: organization.created`
6. Verify organization metadata

## 7. Production Considerations

1. **Security**: Always verify webhook signatures
2. **Idempotency**: Handle duplicate events gracefully
3. **Error Handling**: Implement retry logic for failed database operations
4. **Monitoring**: Set up alerts for webhook failures
5. **Rate Limits**: Respect Clerk's webhook delivery limits

## 8. Troubleshooting

### Common Issues:

1. **"Missing svix headers"**
   - Ensure webhook URL is correct
   - Check that raw body parsing is enabled

2. **"Error verifying webhook"**
   - Verify CLERK_WEBHOOK_SECRET is correct
   - Ensure body is not modified before verification

3. **Events not received**
   - Check webhook is enabled in Clerk Dashboard
   - Verify ngrok tunnel is active (for local testing)
   - Check server logs for errors

### Debug Mode

Add to your webhook handler for debugging:
```javascript
console.log('Webhook headers:', {
  'svix-id': req.headers['svix-id'],
  'svix-timestamp': req.headers['svix-timestamp'],
  'svix-signature': req.headers['svix-signature']?.substring(0, 20) + '...'
});
```