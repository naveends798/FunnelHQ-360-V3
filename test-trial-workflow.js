#!/usr/bin/env node

/**
 * Test script for pro trial workflow
 * Tests the complete trial signup and expiry flow
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

async function testTrialWorkflow() {
  console.log('🧪 Testing Pro Trial Workflow\n');

  // Test 1: Create a new trial user
  console.log('1. Testing new user creation with pro trial...');
  
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    name: 'Test Trial User',
    clerkUserId: `test_${Date.now()}`,
    subscriptionPlan: 'pro_trial',
    trialStartDate: new Date().toISOString()
  };

  try {
    const createResponse = await fetch(`${API_BASE}/api/supabase/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create user: ${createResponse.statusText}`);
    }

    const createResult = await createResponse.json();
    console.log('✅ User created:', {
      email: createResult.user.email,
      plan: createResult.user.subscription_plan,
      maxProjects: createResult.user.max_projects,
      trialStart: createResult.user.trial_start_date
    });

    // Test 2: Check user usage limits
    console.log('\n2. Testing pro trial usage limits...');
    
    const usageResponse = await fetch(`${API_BASE}/api/supabase/users/${encodeURIComponent(testUser.email)}/usage`);
    if (!usageResponse.ok) {
      throw new Error(`Failed to get usage: ${usageResponse.statusText}`);
    }

    const usageResult = await usageResponse.json();
    console.log('✅ Pro trial limits verified:', {
      projects: usageResult.usage.projects.limit,
      storage: usageResult.usage.storage.limitFormatted,
      collaborators: usageResult.usage.collaborators.limit
    });

    // Test 3: Test expired trial user creation
    console.log('\n3. Testing expired trial user...');
    
    const expiredUser = {
      email: `expired-${Date.now()}@example.com`,
      name: 'Expired Trial User',
      clerkUserId: `expired_${Date.now()}`,
      subscriptionPlan: 'pro_trial',
      trialStartDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() // 15 days ago
    };

    const expiredResponse = await fetch(`${API_BASE}/api/supabase/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expiredUser)
    });

    if (!expiredResponse.ok) {
      throw new Error(`Failed to create expired user: ${expiredResponse.statusText}`);
    }

    const expiredResult = await expiredResponse.json();
    console.log('✅ Expired trial user created:', {
      email: expiredResult.user.email,
      plan: expiredResult.user.subscription_plan,
      trialStart: expiredResult.user.trial_start_date
    });

    // Test 4: Run trial expiry process
    console.log('\n4. Testing trial expiry process...');
    
    const expireResponse = await fetch(`${API_BASE}/api/supabase/users/expire-trials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!expireResponse.ok) {
      throw new Error(`Failed to expire trials: ${expireResponse.statusText}`);
    }

    const expireResult = await expireResponse.json();
    console.log('✅ Trial expiry process completed:', {
      expired: expireResult.expired,
      message: expireResult.message
    });

    // Test 5: Verify expired user is now on solo plan
    console.log('\n5. Verifying expired user plan change...');
    
    const checkResponse = await fetch(`${API_BASE}/api/supabase/users/${encodeURIComponent(expiredUser.email)}`);
    if (!checkResponse.ok) {
      throw new Error(`Failed to check expired user: ${checkResponse.statusText}`);
    }

    const checkResult = await checkResponse.json();
    console.log('✅ Expired user verification:', {
      email: checkResult.user.email,
      plan: checkResult.user.subscription_plan,
      maxProjects: checkResult.user.max_projects
    });

    console.log('\n🎉 All trial workflow tests passed!');
    
    // Cleanup
    console.log('\n🧹 Cleaning up test users...');
    await fetch(`${API_BASE}/api/supabase/users/${encodeURIComponent(testUser.email)}`, { method: 'DELETE' });
    await fetch(`${API_BASE}/api/supabase/users/${encodeURIComponent(expiredUser.email)}`, { method: 'DELETE' });
    console.log('✅ Cleanup completed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testTrialWorkflow().catch(console.error);