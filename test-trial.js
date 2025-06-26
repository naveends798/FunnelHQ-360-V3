// Quick test for trial functionality
const { calculateTrialStatus, formatTrialTimeRemaining } = require('./shared/trial-utils.ts');

// Test cases
const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

console.log('Testing trial functionality:');
console.log('=======================');

// Test 1: User just signed up (yesterday)
const trial1 = calculateTrialStatus(yesterday, 'solo', null);
console.log('1. User signed up yesterday:');
console.log('   Days left:', trial1.daysLeft);
console.log('   Is expired:', trial1.isTrialExpired);
console.log('   Time remaining:', formatTrialTimeRemaining(trial1));
console.log('');

// Test 2: User signed up a week ago
const trial2 = calculateTrialStatus(weekAgo, 'solo', null);
console.log('2. User signed up a week ago:');
console.log('   Days left:', trial2.daysLeft);
console.log('   Is expired:', trial2.isTrialExpired);
console.log('   Time remaining:', formatTrialTimeRemaining(trial2));
console.log('');

// Test 3: User signed up two weeks ago (expired)
const trial3 = calculateTrialStatus(twoWeeksAgo, 'solo', null);
console.log('3. User signed up two weeks ago:');
console.log('   Days left:', trial3.daysLeft);
console.log('   Is expired:', trial3.isTrialExpired);
console.log('   Time remaining:', formatTrialTimeRemaining(trial3));
console.log('');

// Test 4: User has paid subscription
const trial4 = calculateTrialStatus(weekAgo, 'pro', 'stripe_sub_123');
console.log('4. User has paid subscription:');
console.log('   Is on trial:', trial4.isOnTrial);
console.log('   Days left:', trial4.daysLeft);
console.log('   Time remaining:', formatTrialTimeRemaining(trial4));
console.log('');

console.log('✅ Trial calculation tests completed!');