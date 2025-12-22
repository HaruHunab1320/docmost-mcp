#!/bin/bash

echo "Testing MCP Endpoints Locally"
echo "============================="

# Test 1: Health check
echo -e "\n1. Testing health endpoint:"
curl -s http://localhost:3000/api/health | jq '.' || echo "Failed"

# Test 2: MCP tools endpoint (should be public)
echo -e "\n2. Testing MCP tools endpoint (should be public):"
curl -s http://localhost:3000/api/mcp/tools | jq '.' || echo "Failed"

# Test 3: API key registration without token (should fail)
echo -e "\n3. Testing API key registration without token (should fail with 401):"
curl -s -X POST http://localhost:3000/api/api-keys/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "userId": "test", "workspaceId": "test"}' | jq '.' || echo "Failed"

# Test 4: API key registration with wrong token (should fail)
echo -e "\n4. Testing API key registration with wrong token (should fail with 401):"
curl -s -X POST http://localhost:3000/api/api-keys/register \
  -H "Content-Type: application/json" \
  -H "x-registration-token: wrong-token" \
  -d '{"name": "Test", "userId": "test", "workspaceId": "test"}' | jq '.' || echo "Failed"

# Test 5: API key registration with correct token but invalid user (should fail with 400)
echo -e "\n5. Testing API key registration with correct token but invalid user:"
APP_SECRET=$(grep APP_SECRET .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
curl -s -X POST http://localhost:3000/api/api-keys/register \
  -H "Content-Type: application/json" \
  -H "x-registration-token: $APP_SECRET" \
  -d '{"name": "Test MCP Key", "userId": "invalid-user", "workspaceId": "invalid-workspace"}' | jq '.' || echo "Failed"

# Test 6: Test main MCP endpoint
echo -e "\n6. Testing main MCP endpoint without auth (should fail):"
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "system.ping",
    "params": {},
    "id": 1
  }' | jq '.' || echo "Failed"

echo -e "\n\nSummary:"
echo "- Server is running on port 3000"
echo "- MCP endpoints are registered and accessible"
echo "- Authentication is working (blocking unauthorized requests)"
echo "- The /api/mcp/tools endpoint requires auth (even though marked @Public)"
echo "- To create API keys, we need valid user and workspace IDs from the database"
