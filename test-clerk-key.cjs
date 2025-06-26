#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Extract Clerk key
const clerkKeyMatch = envContent.match(/VITE_CLERK_PUBLISHABLE_KEY=(.+)/);
const clerkKey = clerkKeyMatch ? clerkKeyMatch[1].trim() : null;

console.log('🔍 Clerk Key Analysis:');
console.log('Key found:', !!clerkKey);
console.log('Key length:', clerkKey ? clerkKey.length : 0);
console.log('Starts with pk_test_:', clerkKey ? clerkKey.startsWith('pk_test_') : false);
console.log('First 30 chars:', clerkKey ? clerkKey.substring(0, 30) : 'N/A');

if (clerkKey) {
  // Decode the base64 part to see what it contains
  try {
    const base64Part = clerkKey.replace('pk_test_', '');
    const decoded = Buffer.from(base64Part, 'base64').toString('utf8');
    console.log('Decoded domain:', decoded);
    
    // Check if it looks like a valid Clerk domain
    if (decoded.includes('.clerk.accounts.dev')) {
      console.log('✅ Key appears to be valid Clerk test key');
    } else {
      console.log('❌ Key might be invalid or corrupted');
    }
  } catch (error) {
    console.log('❌ Error decoding key:', error.message);
  }
} else {
  console.log('❌ No Clerk key found in .env file');
}

console.log('\n🎯 Next Steps:');
console.log('1. Go to https://dashboard.clerk.com/');
console.log('2. Access your "gentle-tomcat-91" application');
console.log('3. Create an admin user with role: "admin" in public metadata');
console.log('4. Test login with the admin credentials');