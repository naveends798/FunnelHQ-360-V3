# Creating Real Admin Account in Clerk

## Step 1: Access Clerk Dashboard
1. Go to https://dashboard.clerk.com/
2. Sign in with your Clerk account
3. Select your "gentle-tomcat-91" application (based on the publishable key)

## Step 2: Create Admin User
1. In Clerk Dashboard, go to "Users" section
2. Click "Create User"
3. Fill in admin details:
   - **Email**: `admin@funnelportals.com`
   - **Password**: `AdminPassword123!`
   - **First Name**: `Admin`
   - **Last Name**: `User`

## Step 3: Set Admin Role
1. After creating the user, click on the user profile
2. Go to "Public metadata" section
3. Add the following JSON:
```json
{
  "role": "admin",
  "organizationId": "1"
}
```

## Step 4: Test Login
1. Go to your app's login page: http://localhost:3000/login
2. Use the admin credentials:
   - Email: `admin@funnelportals.com`
   - Password: `AdminPassword123!`

## Step 5: Verify Admin Access
1. After login, navigate to the clients page
2. Try creating a new client
3. Verify the data is saved to Supabase

---

## Alternative: Test Credentials
If you prefer different credentials, use:
- **Email**: `test-admin@example.com`
- **Password**: `TestAdmin123!`

Make sure to set the `role: "admin"` in public metadata!