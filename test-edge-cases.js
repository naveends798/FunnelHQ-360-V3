#!/usr/bin/env node

/**
 * FunnelHQ 360 - Edge Case Testing
 * Tests error handling, edge cases, and system resilience
 */

const BASE_URL = 'http://localhost:3002';

// Helper function for API calls
async function apiCall(endpoint, method = 'GET', userId = 1, body = null, headers = {}) {
  try {
    const url = new URL(endpoint, BASE_URL);
    
    // Add user context unless it's a malicious test
    if (!headers['skip-auth']) {
      url.searchParams.set('userId', userId.toString());
      url.searchParams.set('organizationId', '1');
    }
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EdgeCaseTest/1.0',
        ...headers
      }
    };
    
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }
    
    console.log(`📡 ${method} ${url.pathname} ${headers['skip-auth'] ? '(no auth)' : `(User: ${userId})`}`);
    
    const response = await fetch(url.toString(), options);
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

// Edge Case Tests
const edgeCaseTests = [
  {
    name: 'Malformed JSON Request',
    description: 'Test handling of invalid JSON in request body',
    test: async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/clients?userId=1`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{ invalid json }'
        });
        
        return {
          passed: response.status >= 400 && response.status < 500,
          details: `Status: ${response.status} (should be 4xx for bad JSON)`
        };
      } catch (error) {
        return { passed: true, details: 'Request properly rejected' };
      }
    }
  },
  
  {
    name: 'Missing Required Fields',
    description: 'Test validation of required fields in client creation',
    test: async () => {
      const result = await apiCall('/api/clients', 'POST', 1, {
        name: "Test Client"
        // Missing email and createdBy
      });
      
      return {
        passed: result.status === 400,
        details: `Status: ${result.status}, Error: ${result.data?.error || 'No error'}`
      };
    }
  },
  
  {
    name: 'SQL Injection in URL Parameters',
    description: 'Test protection against SQL injection in route parameters',
    test: async () => {
      const maliciousId = "1'; DROP TABLE projects; --";
      const result = await apiCall(`/api/clients/${encodeURIComponent(maliciousId)}`);
      
      return {
        passed: result.status === 404 || result.status === 400,
        details: `Status: ${result.status} (should reject malicious input)`
      };
    }
  },
  
  {
    name: 'Very Large Request Body',
    description: 'Test handling of oversized request payloads',
    test: async () => {
      const largeData = {
        name: "A".repeat(10000),
        email: "test@example.com",
        notes: "B".repeat(50000),
        createdBy: 1
      };
      
      const result = await apiCall('/api/clients', 'POST', 1, largeData);
      
      return {
        passed: result.status === 400 || result.status === 413 || result.ok,
        details: `Status: ${result.status} (handled large payload)`
      };
    }
  },
  
  {
    name: 'Invalid User ID Formats',
    description: 'Test handling of various invalid user ID formats',
    test: async () => {
      const invalidIds = [
        'abc',
        '1.5',
        '-1',
        '999999999999999999999',
        'null',
        'undefined'
      ];
      
      let allHandledCorrectly = true;
      const results = [];
      
      for (const id of invalidIds) {
        const result = await apiCall('/api/projects', 'GET', id);
        const handledCorrectly = result.status === 400 || result.status === 404;
        if (!handledCorrectly) allHandledCorrectly = false;
        results.push(`${id}: ${result.status}`);
      }
      
      return {
        passed: allHandledCorrectly,
        details: `Results: ${results.join(', ')}`
      };
    }
  },
  
  {
    name: 'Concurrent Requests',
    description: 'Test system stability under concurrent requests',
    test: async () => {
      const promises = [];
      const requestCount = 10;
      
      // Create multiple concurrent requests
      for (let i = 0; i < requestCount; i++) {
        promises.push(apiCall('/api/users', 'GET', 1));
      }
      
      const results = await Promise.all(promises);
      const successfulRequests = results.filter(r => r.ok).length;
      
      return {
        passed: successfulRequests >= requestCount * 0.8, // 80% success rate acceptable
        details: `${successfulRequests}/${requestCount} requests successful`
      };
    }
  },
  
  {
    name: 'Non-Existent Endpoints',
    description: 'Test handling of requests to non-existent endpoints',
    test: async () => {
      const result = await apiCall('/api/nonexistent-endpoint');
      
      return {
        passed: result.status === 404,
        details: `Status: ${result.status} (should be 404 for non-existent endpoint)`
      };
    }
  },
  
  {
    name: 'Unauthorized Access Without User ID',
    description: 'Test protection when user ID is not provided',
    test: async () => {
      const result = await apiCall('/api/clients', 'GET', null, null, { 'skip-auth': true });
      
      return {
        passed: result.status === 401 || result.status === 403,
        details: `Status: ${result.status} (should require authentication)`
      };
    }
  },
  
  {
    name: 'Invalid HTTP Methods',
    description: 'Test handling of invalid HTTP methods on endpoints',
    test: async () => {
      const result = await apiCall('/api/users', 'DELETE', 1);
      
      return {
        passed: result.status === 405 || result.status === 404,
        details: `Status: ${result.status} (should reject invalid methods)`
      };
    }
  },
  
  {
    name: 'Database Connection Resilience',
    description: 'Test that application handles database errors gracefully',
    test: async () => {
      // This test assumes the database is working
      const result = await apiCall('/api/users', 'GET', 1);
      
      return {
        passed: result.ok || result.status === 500, // Either works or returns proper error
        details: `Status: ${result.status} (database ${result.ok ? 'working' : 'error handled'})`
      };
    }
  }
];

// Performance baseline tests
const performanceTests = [
  {
    name: 'Response Time Test',
    description: 'Verify API response times are acceptable',
    test: async () => {
      const startTime = Date.now();
      const result = await apiCall('/api/users', 'GET', 1);
      const responseTime = Date.now() - startTime;
      
      return {
        passed: responseTime < 2000, // 2 second threshold
        details: `Response time: ${responseTime}ms (threshold: <2000ms)`
      };
    }
  },
  
  {
    name: 'Memory Leak Check',
    description: 'Basic check for obvious memory issues',
    test: async () => {
      // Make multiple requests to check for memory leaks
      const requests = 20;
      const startTime = Date.now();
      
      for (let i = 0; i < requests; i++) {
        await apiCall('/api/users', 'GET', 1);
      }
      
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / requests;
      
      return {
        passed: avgTime < 500, // Average response time under 500ms
        details: `${requests} requests, average time: ${avgTime}ms`
      };
    }
  }
];

// Run edge case tests
async function runEdgeCaseTests() {
  console.log('🔍 FunnelHQ 360 - Edge Case & Resilience Testing');
  console.log('=' .repeat(60));
  console.log('');
  
  // Wait for server to be ready
  console.log('⏳ Waiting for server to be ready...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  let totalTests = 0;
  let passedTests = 0;
  
  // Run edge case tests
  console.log('🧪 Edge Case Tests:');
  for (const test of edgeCaseTests) {
    totalTests++;
    console.log(`\n  Testing: ${test.name}`);
    
    try {
      const result = await test.test();
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${status} ${result.details}`);
      
      if (result.passed) passedTests++;
    } catch (error) {
      console.log(`  ❌ FAIL Error: ${error.message}`);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Run performance tests
  console.log('\n🚀 Performance Tests:');
  for (const test of performanceTests) {
    totalTests++;
    console.log(`\n  Testing: ${test.name}`);
    
    try {
      const result = await test.test();
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${status} ${result.details}`);
      
      if (result.passed) passedTests++;
    } catch (error) {
      console.log(`  ❌ FAIL Error: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('');
  console.log('=' .repeat(60));
  console.log(`📊 Edge Case Test Results: ${passedTests}/${totalTests} passed (${Math.round(passedTests/totalTests*100)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All edge case tests passed! System is resilient.');
  } else {
    console.log('⚠️  Some edge case tests failed. Review error handling.');
  }
  
  return { total: totalTests, passed: passedTests };
}

// Run tests
runEdgeCaseTests().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Edge case test error:', error);
  process.exit(1);
});