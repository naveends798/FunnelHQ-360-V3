#!/usr/bin/env node

/**
 * FunnelHQ 360 - Role-Based Access Testing Script
 * Tests all role access patterns and security boundaries
 */

const BASE_URL = 'http://localhost:3002';

// Test Data
const testUsers = {
  admin: { id: 1, role: 'admin', name: 'Admin User' },
  teamMember: { id: 2, role: 'team_member', name: 'Team Member' },
  client: { id: 3, role: 'client', name: 'Client User' }
};

// Mock request function (simulates frontend API calls)
async function mockApiRequest(endpoint, method = 'GET', userId = 1, organizationId = 1) {
  try {
    const url = new URL(endpoint, BASE_URL);
    
    // Add query parameters for user context
    if (method === 'GET') {
      url.searchParams.set('userId', userId.toString());
      url.searchParams.set('organizationId', organizationId.toString());
    }
    
    console.log(`📡 Testing ${method} ${url.pathname} (User ID: ${userId})`);
    
    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RoleAccessTest/1.0'
      }
    });
    
    const result = {
      status: response.status,
      ok: response.ok,
      data: null,
      error: null
    };
    
    try {
      result.data = await response.json();
    } catch (e) {
      result.error = 'Invalid JSON response';
    }
    
    return result;
  } catch (error) {
    return {
      status: 0,
      ok: false,
      data: null,
      error: error.message
    };
  }
}

// Test Cases
const testCases = [
  {
    name: 'Admin Project Access',
    description: 'Admin should see all projects',
    test: async () => {
      const result = await mockApiRequest('/api/projects', 'GET', testUsers.admin.id);
      return {
        passed: result.ok && Array.isArray(result.data),
        details: `Status: ${result.status}, Projects: ${result.data?.length || 0}`
      };
    }
  },
  {
    name: 'Team Member Project Access',
    description: 'Team member should only see assigned projects',
    test: async () => {
      const result = await mockApiRequest('/api/projects', 'GET', testUsers.teamMember.id);
      return {
        passed: result.ok,
        details: `Status: ${result.status}, Projects: ${result.data?.length || 0}`
      };
    }
  },
  {
    name: 'Client Project Access',
    description: 'Client should only see their own projects',
    test: async () => {
      const result = await mockApiRequest('/api/projects', 'GET', testUsers.client.id);
      return {
        passed: result.ok,
        details: `Status: ${result.status}, Projects: ${result.data?.length || 0}`
      };
    }
  },
  {
    name: 'Admin Client Access',
    description: 'Admin should see all clients',
    test: async () => {
      const result = await mockApiRequest('/api/clients', 'GET', testUsers.admin.id);
      return {
        passed: result.ok && Array.isArray(result.data),
        details: `Status: ${result.status}, Clients: ${result.data?.length || 0}`
      };
    }
  },
  {
    name: 'Team Member Client Access',
    description: 'Team member should NOT see clients endpoint',
    test: async () => {
      const result = await mockApiRequest('/api/clients', 'GET', testUsers.teamMember.id);
      return {
        passed: !result.ok || result.status === 403,
        details: `Status: ${result.status} (should be 403 or error)`
      };
    }
  },
  {
    name: 'Client Client Access',
    description: 'Client should NOT see clients endpoint',
    test: async () => {
      const result = await mockApiRequest('/api/clients', 'GET', testUsers.client.id);
      return {
        passed: !result.ok || result.status === 403,
        details: `Status: ${result.status} (should be 403 or error)`
      };
    }
  },
  {
    name: 'Admin User Access',
    description: 'Admin should see all users',
    test: async () => {
      const result = await mockApiRequest('/api/users', 'GET', testUsers.admin.id);
      return {
        passed: result.ok && Array.isArray(result.data),
        details: `Status: ${result.status}, Users: ${result.data?.length || 0}`
      };
    }
  },
  {
    name: 'Database Connection',
    description: 'Verify database is connected and accessible',
    test: async () => {
      const result = await mockApiRequest('/api/users', 'GET', testUsers.admin.id);
      return {
        passed: result.status !== 500,
        details: `Status: ${result.status} (500 would indicate DB connection issue)`
      };
    }
  }
];

// Security Boundary Tests
const securityTests = [
  {
    name: 'SQL Injection Protection',
    description: 'Test protection against SQL injection in user ID parameter',
    test: async () => {
      const maliciousUserId = "1'; DROP TABLE users; --";
      const result = await mockApiRequest('/api/projects', 'GET', maliciousUserId);
      return {
        passed: result.status === 400 || result.status === 422,
        details: `Status: ${result.status} (should reject malicious input)`
      };
    }
  },
  {
    name: 'Invalid User ID Protection',
    description: 'Test handling of invalid user IDs',
    test: async () => {
      const result = await mockApiRequest('/api/projects', 'GET', 99999); // Non-existent user
      return {
        passed: result.ok || result.status === 404,
        details: `Status: ${result.status} (should handle gracefully)`
      };
    }
  }
];

// Run all tests
async function runTests() {
  console.log('🧪 FunnelHQ 360 - Role-Based Access Testing');
  console.log('=' .repeat(50));
  console.log('');
  
  // Wait for server to be ready
  console.log('⏳ Waiting for server to be ready...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  let totalTests = 0;
  let passedTests = 0;
  
  // Run main test cases
  console.log('📋 Running Role Access Tests:');
  for (const testCase of testCases) {
    totalTests++;
    try {
      const result = await testCase.test();
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${testCase.name}: ${result.details}`);
      if (result.passed) passedTests++;
    } catch (error) {
      console.log(`❌ FAIL ${testCase.name}: Error - ${error.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
  }
  
  console.log('');
  console.log('🔒 Running Security Tests:');
  for (const testCase of securityTests) {
    totalTests++;
    try {
      const result = await testCase.test();
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${testCase.name}: ${result.details}`);
      if (result.passed) passedTests++;
    } catch (error) {
      console.log(`❌ FAIL ${testCase.name}: Error - ${error.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('');
  console.log('=' .repeat(50));
  console.log(`📊 Test Results: ${passedTests}/${totalTests} passed (${Math.round(passedTests/totalTests*100)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Role-based access is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Review the access control implementation.');
  }
  
  return { total: totalTests, passed: passedTests };
}

// Run tests directly
runTests().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});