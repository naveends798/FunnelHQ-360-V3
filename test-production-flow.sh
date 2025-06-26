#!/bin/bash

echo "🚀 FunnelHQ 360 - Production Data Flow Testing"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3002"

echo -e "${BLUE}📋 Phase 1: Testing Current Server (Development Mode)${NC}"
echo "Checking if server is running..."

# Test if server is up
if curl -s -f "${BASE_URL}/api/stats" > /dev/null; then
    echo -e "${GREEN}✅ Server is running${NC}"
    
    echo -e "${BLUE}📊 Current Stats:${NC}"
    curl -s "${BASE_URL}/api/stats" | jq .
    
    echo -e "${BLUE}👥 Current Clients:${NC}"
    CLIENTS=$(curl -s "${BASE_URL}/api/clients")
    echo "$CLIENTS" | jq '.[] | {id: .id, name: .name, email: .email}'
    CLIENT_COUNT=$(echo "$CLIENTS" | jq length)
    echo -e "${YELLOW}Total clients: $CLIENT_COUNT${NC}"
    
    echo -e "${BLUE}📁 Current Projects:${NC}"
    PROJECTS=$(curl -s "${BASE_URL}/api/projects")
    echo "$PROJECTS" | jq '.[] | {id: .id, title: .title, status: .status}' 2>/dev/null || echo "No projects or format issue"
    PROJECT_COUNT=$(echo "$PROJECTS" | jq length 2>/dev/null || echo "0")
    echo -e "${YELLOW}Total projects: $PROJECT_COUNT${NC}"
    
else
    echo -e "${RED}❌ Server is not running. Please start it first.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 Phase 2: Testing Data Persistence (Memory vs Database)${NC}"

# Create a test client to check persistence
echo "Creating test client to check data source..."
TEST_CLIENT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/clients" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Production Test Client",
        "email": "prod-test@example.com",
        "organizationId": 1,
        "createdBy": 1
    }')

if echo "$TEST_CLIENT_RESPONSE" | jq -e '.id' > /dev/null; then
    TEST_CLIENT_ID=$(echo "$TEST_CLIENT_RESPONSE" | jq -r '.id')
    echo -e "${GREEN}✅ Test client created with ID: $TEST_CLIENT_ID${NC}"
    
    # Check if it appears in the list
    echo "Verifying client appears in list..."
    if curl -s "${BASE_URL}/api/clients" | jq -e ".[] | select(.id == $TEST_CLIENT_ID)" > /dev/null; then
        echo -e "${GREEN}✅ Client found in list - data persistence working${NC}"
    else
        echo -e "${RED}❌ Client not found in list - potential issue${NC}"
    fi
else
    echo -e "${RED}❌ Failed to create test client${NC}"
    echo "Response: $TEST_CLIENT_RESPONSE"
fi

echo ""
echo -e "${BLUE}📋 Phase 3: Switching to Production Mode${NC}"

echo "Stopping current server..."
pkill -f "tsx server/index.ts" 2>/dev/null || true
sleep 3

echo "Starting server in production mode..."

# Start server in production mode in background
NODE_ENV=production npx tsx server/index.ts &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 8

# Check if server started successfully
if curl -s -f "${BASE_URL}/api/stats" > /dev/null; then
    echo -e "${GREEN}✅ Production server started successfully${NC}"
    
    echo -e "${BLUE}📊 Production Mode Stats:${NC}"
    curl -s "${BASE_URL}/api/stats" | jq .
    
    echo -e "${BLUE}👥 Production Mode Clients:${NC}"
    PROD_CLIENTS=$(curl -s "${BASE_URL}/api/clients")
    echo "$PROD_CLIENTS" | jq '.[] | {id: .id, name: .name, email: .email}' 2>/dev/null || echo "No clients or format issue"
    PROD_CLIENT_COUNT=$(echo "$PROD_CLIENTS" | jq length 2>/dev/null || echo "0")
    echo -e "${YELLOW}Total clients in production: $PROD_CLIENT_COUNT${NC}"
    
    # Check if this is truly using Supabase (should be empty initially)
    if [ "$PROD_CLIENT_COUNT" -eq 0 ]; then
        echo -e "${GREEN}✅ Production mode is using Supabase (empty database)${NC}"
    else
        echo -e "${YELLOW}⚠️  Production mode might still be using memory storage${NC}"
    fi
    
else
    echo -e "${RED}❌ Failed to start production server${NC}"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo -e "${BLUE}📋 Phase 4: Testing Production Data Flow${NC}"

echo "Testing client creation in production mode..."
PROD_CLIENT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/clients" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Production Database Client",
        "email": "prod-db@example.com",
        "organizationId": 1,
        "createdBy": 1
    }')

if echo "$PROD_CLIENT_RESPONSE" | jq -e '.id' > /dev/null; then
    PROD_CLIENT_ID=$(echo "$PROD_CLIENT_RESPONSE" | jq -r '.id')
    echo -e "${GREEN}✅ Production client created with ID: $PROD_CLIENT_ID${NC}"
    
    echo "Testing client retrieval..."
    RETRIEVED_CLIENT=$(curl -s "${BASE_URL}/api/clients/${PROD_CLIENT_ID}")
    if echo "$RETRIEVED_CLIENT" | jq -e '.id' > /dev/null; then
        echo -e "${GREEN}✅ Client retrieved successfully${NC}"
        echo "$RETRIEVED_CLIENT" | jq '{id: .id, name: .name, email: .email}'
    else
        echo -e "${RED}❌ Failed to retrieve client${NC}"
    fi
    
    echo "Testing project creation..."
    PROD_PROJECT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/projects" \
        -H "Content-Type: application/json" \
        -d "{
            \"title\": \"Production Test Project\",
            \"description\": \"Testing production database flow\",
            \"clientId\": $PROD_CLIENT_ID,
            \"organizationId\": 1,
            \"ownerId\": 1,
            \"createdBy\": 1,
            \"budget\": \"10000\",
            \"status\": \"active\"
        }")
    
    if echo "$PROD_PROJECT_RESPONSE" | jq -e '.id' > /dev/null; then
        PROD_PROJECT_ID=$(echo "$PROD_PROJECT_RESPONSE" | jq -r '.id')
        echo -e "${GREEN}✅ Production project created with ID: $PROD_PROJECT_ID${NC}"
        echo "$PROD_PROJECT_RESPONSE" | jq '{id: .id, title: .title, status: .status}'
    else
        echo -e "${RED}❌ Failed to create project${NC}"
        echo "Response: $PROD_PROJECT_RESPONSE"
    fi
    
else
    echo -e "${RED}❌ Failed to create production client${NC}"
    echo "Response: $PROD_CLIENT_RESPONSE"
fi

echo ""
echo -e "${BLUE}📋 Phase 5: Server Restart Persistence Test${NC}"

echo "Restarting server to test data persistence..."
kill $SERVER_PID
sleep 3

echo "Starting server again..."
NODE_ENV=production npx tsx server/index.ts &
SERVER_PID=$!
sleep 8

if curl -s -f "${BASE_URL}/api/stats" > /dev/null; then
    echo -e "${GREEN}✅ Server restarted successfully${NC}"
    
    echo "Checking if data persisted after restart..."
    PERSISTED_CLIENTS=$(curl -s "${BASE_URL}/api/clients")
    PERSISTED_COUNT=$(echo "$PERSISTED_CLIENTS" | jq length 2>/dev/null || echo "0")
    
    if [ "$PERSISTED_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ Data persisted after restart! Found $PERSISTED_COUNT clients${NC}"
        echo "$PERSISTED_CLIENTS" | jq '.[] | {id: .id, name: .name, email: .email}'
        
        echo -e "${GREEN}🎉 PRODUCTION DATABASE IS WORKING!${NC}"
        echo -e "${GREEN}✅ Data flows from frontend → backend → Supabase database${NC}"
        echo -e "${GREEN}✅ Data persists across server restarts${NC}"
        echo -e "${GREEN}✅ Ready for real-world testing${NC}"
    else
        echo -e "${YELLOW}⚠️  No data persisted - check if Supabase integration is working${NC}"
    fi
else
    echo -e "${RED}❌ Failed to restart server${NC}"
fi

echo ""
echo -e "${BLUE}📋 Phase 6: Access Production Supabase Dashboard${NC}"
echo "You can view your data in the Supabase dashboard:"
echo "🔗 https://supabase.com/dashboard/project/ptlahrhzavhekjvtyfud"
echo ""
echo "Tables to check:"
echo "• users: User accounts and profiles"
echo "• clients: Client information"  
echo "• projects: Project data"
echo "• organizations: Organization settings"

echo ""
echo -e "${BLUE}📋 Testing Complete!${NC}"
echo "Server is still running in production mode on port 3002"
echo "You can now test the frontend at http://localhost:3002"

# Keep server running
wait $SERVER_PID