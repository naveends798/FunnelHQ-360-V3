#!/usr/bin/env node

/**
 * Debug project creation issue
 */

const BASE_URL = 'http://localhost:3002';

async function testProjectCreation() {
  try {
    // First, create a client
    console.log('Creating client...');
    const clientResponse = await fetch(`${BASE_URL}/api/clients?userId=1&organizationId=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: "Debug Client",
        email: "debug@test.com",
        notes: "Debug test client",
        createdBy: 1
      })
    });
    
    if (!clientResponse.ok) {
      console.error('Client creation failed:', clientResponse.status);
      const errorText = await clientResponse.text();
      console.error('Error:', errorText);
      return;
    }
    
    const client = await clientResponse.json();
    console.log('✅ Client created:', client.id);
    
    // Now try to create a project
    console.log('Creating project...');
    const projectData = {
      title: "Debug Project",
      description: "Debug test project", 
      clientId: client.id,
      ownerId: 1,
      budget: "1000.00",
      priority: "medium",
      createdBy: 1
    };
    
    console.log('Project data:', JSON.stringify(projectData, null, 2));
    
    const projectResponse = await fetch(`${BASE_URL}/api/projects?userId=1&organizationId=1`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    });
    
    if (!projectResponse.ok) {
      console.error('Project creation failed:', projectResponse.status);
      const errorText = await projectResponse.text();
      console.error('Error:', errorText);
      return;
    }
    
    const project = await projectResponse.json();
    console.log('✅ Project created:', project.id);
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testProjectCreation();