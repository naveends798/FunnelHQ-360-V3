#!/usr/bin/env node

// Test script to verify client creation API with authentication
async function testClientCreation() {
  const testData = {
    name: "Test Client",
    email: "test.client@example.com", 
    notes: "Test client creation"
  };

  console.log("Testing client creation API...");
  console.log("Test data:", testData);

  try {
    // Test without authentication first to confirm 401 error
    console.log("\n1. Testing without authentication (should get 401):");
    const response1 = await fetch("http://localhost:3000/api/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData),
    });

    console.log("Response status:", response1.status);
    const result1 = await response1.text();
    console.log("Response:", result1);

    // Test with invalid token
    console.log("\n2. Testing with invalid token (should get 401):");
    const response2 = await fetch("http://localhost:3000/api/clients", {
      method: "POST", 
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer invalid_token"
      },
      body: JSON.stringify(testData),
    });

    console.log("Response status:", response2.status);
    const result2 = await response2.text();
    console.log("Response:", result2);

  } catch (error) {
    console.error("Test error:", error);
  }
}

testClientCreation();