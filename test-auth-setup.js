#!/usr/bin/env node

// Test script to verify that the clients endpoint now properly requires authentication
async function testClientEndpoint() {
  console.log("Testing client endpoints with authentication...");

  try {
    // Test GET endpoint
    console.log("\n1. Testing GET /api/clients (should get 401):");
    const response1 = await fetch("http://localhost:3000/api/clients");
    console.log("Response status:", response1.status);
    const result1 = await response1.text();
    console.log("Response:", result1);

    // Test POST endpoint  
    console.log("\n2. Testing POST /api/clients (should get 401):");
    const response2 = await fetch("http://localhost:3000/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", email: "test@example.com" }),
    });
    console.log("Response status:", response2.status);
    const result2 = await response2.text();
    console.log("Response:", result2);

    // Test team endpoint (should work without auth)
    console.log("\n3. Testing GET /api/team/members (should work):");
    const response3 = await fetch("http://localhost:3000/api/team/members?organizationId=1");
    console.log("Response status:", response3.status);
    if (response3.ok) {
      const result3 = await response3.json();
      console.log("Response:", result3.length, "team members found");
    } else {
      const result3 = await response3.text();
      console.log("Response:", result3);
    }

  } catch (error) {
    console.error("Test error:", error);
  }
}

testClientEndpoint();