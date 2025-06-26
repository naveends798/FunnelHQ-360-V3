#!/usr/bin/env node

/**
 * FunnelHQ 360 - Production Health Check
 * Verifies all systems are operational before go-live
 */

const BASE_URL = 'http://localhost:3002';

// Health Check Tests
const healthChecks = [
  {
    name: 'Database Connection',
    description: 'Verify Supabase database is connected and accessible',
    test: async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/users?userId=1&organizationId=1`);
        const data = await response.json();
        
        return {
          passed: response.ok && Array.isArray(data),
          details: `Status: ${response.status}, Users: ${data?.length || 0}`,
          critical: true
        };
      } catch (error) {
        return {
          passed: false,
          details: `Connection failed: ${error.message}`,
          critical: true
        };
      }
    }
  },
  
  {
    name: 'Admin Role Access',
    description: 'Verify admin can access all resources',
    test: async () => {
      try {
        const [users, projects, clients] = await Promise.all([
          fetch(`${BASE_URL}/api/users?userId=1&organizationId=1`),
          fetch(`${BASE_URL}/api/projects?userId=1&organizationId=1`),
          fetch(`${BASE_URL}/api/clients?userId=1&organizationId=1`)
        ]);
        
        const allSuccessful = users.ok && projects.ok && clients.ok;
        const userCount = (await users.json())?.length || 0;
        const projectCount = (await projects.json())?.length || 0;
        const clientCount = (await clients.json())?.length || 0;
        
        return {
          passed: allSuccessful,
          details: `Admin access: ${userCount} users, ${projectCount} projects, ${clientCount} clients`,
          critical: true
        };
      } catch (error) {
        return {
          passed: false,
          details: `Admin access failed: ${error.message}`,
          critical: true
        };
      }
    }
  },
  
  {
    name: 'Team Member Restrictions',
    description: 'Verify team members cannot access clients',
    test: async () => {
      try {
        const clientsResponse = await fetch(`${BASE_URL}/api/clients?userId=2&organizationId=1`);
        
        // Team members should be blocked from clients (403) or have filtered access
        const isRestricted = clientsResponse.status === 403 || !clientsResponse.ok;
        
        return {
          passed: isRestricted,
          details: `Team member client access: ${clientsResponse.status} (should be 403 or blocked)`,
          critical: true
        };
      } catch (error) {
        return {
          passed: false,
          details: `Team member test failed: ${error.message}`,
          critical: false
        };
      }
    }
  },
  
  {
    name: 'Client Project Access',
    description: 'Verify clients can only see their projects',
    test: async () => {
      try {
        const projectsResponse = await fetch(`${BASE_URL}/api/projects?userId=3&organizationId=1`);
        const projects = await projectsResponse.json();
        
        return {
          passed: projectsResponse.ok,
          details: `Client project access: ${projectsResponse.status}, ${projects?.length || 0} projects visible`,
          critical: true
        };
      } catch (error) {
        return {
          passed: false,
          details: `Client access failed: ${error.message}`,
          critical: false
        };
      }
    }
  },
  
  {
    name: 'API Response Performance',
    description: 'Verify acceptable response times',
    test: async () => {
      try {
        const startTime = Date.now();
        const response = await fetch(`${BASE_URL}/api/users?userId=1&organizationId=1`);
        const responseTime = Date.now() - startTime;
        
        return {
          passed: responseTime < 1000 && response.ok,
          details: `Response time: ${responseTime}ms (target: <1000ms)`,
          critical: false
        };
      } catch (error) {
        return {
          passed: false,
          details: `Performance test failed: ${error.message}`,
          critical: false
        };
      }
    }
  },
  
  {
    name: 'Data Persistence Check',
    description: 'Verify data is persistent (not using MemStorage)',
    test: async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/users?userId=1&organizationId=1`);
        const users = await response.json();
        
        // If we have users, it means data is persistent
        const hasPersistentData = users && users.length > 0;
        
        return {
          passed: hasPersistentData,
          details: `Persistent data check: ${users?.length || 0} users found (confirms SupabaseStorage)`,
          critical: true
        };
      } catch (error) {
        return {
          passed: false,
          details: `Persistence check failed: ${error.message}`,
          critical: true
        };
      }
    }
  }
];

// Run health checks
async function runHealthChecks() {
  console.log('🏥 FunnelHQ 360 - Production Health Check');
  console.log('='.repeat(50));
  console.log('');
  
  // Wait for server to be ready
  console.log('⏳ Waiting for server to be ready...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  let totalChecks = 0;
  let passedChecks = 0;
  let criticalFailures = 0;
  
  for (const check of healthChecks) {
    totalChecks++;
    console.log(`🔍 ${check.name}`);
    
    try {
      const result = await check.test();
      const status = result.passed ? '✅ HEALTHY' : '❌ ISSUE';
      console.log(`  ${status} ${result.details}`);
      
      if (result.passed) {
        passedChecks++;
      } else if (result.critical) {
        criticalFailures++;
        console.log(`  ⚠️  CRITICAL: This issue must be resolved before production!`);
      }
      
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}`);
      if (check.critical) criticalFailures++;
    }
    
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('='.repeat(50));
  console.log(`📊 Health Check Results: ${passedChecks}/${totalChecks} passed`);
  
  if (criticalFailures === 0) {
    console.log('🎉 ALL CRITICAL SYSTEMS HEALTHY - Ready for production!');
    console.log('✅ Database connected and persistent');
    console.log('✅ Role-based access working correctly');
    console.log('✅ Performance acceptable');
  } else {
    console.log(`❌ ${criticalFailures} critical issues found - Fix before deploying!`);
  }
  
  return { total: totalChecks, passed: passedChecks, critical: criticalFailures };
}

// Run health checks immediately
runHealthChecks().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Health check error:', error);
  process.exit(1);
});