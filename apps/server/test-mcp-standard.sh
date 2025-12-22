#!/bin/bash

# MCP Standard API Test Script
# Tests the integrated MCP Standard endpoints

API_URL="http://localhost:3000/api/mcp-standard"
API_KEY="${MCP_API_KEY:-your_api_key_here}"

echo "Testing MCP Standard Integration..."
echo "================================="
echo "API URL: $API_URL"
echo "API Key: ${API_KEY:0:10}..."
echo ""

# Test 1: Initialize (no auth required)
echo "1. Testing initialize endpoint..."
curl -s -X POST "$API_URL/initialize" \
  -H "Content-Type: application/json" \
  -d '{
    "protocolVersion": "2024-11-05",
    "capabilities": {}
  }' | jq '.'

echo ""
echo "2. Testing list_tools endpoint (no auth required)..."
curl -s -X POST "$API_URL/list_tools" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.data.tools | length as $count | "Found \($count) tools"'

echo ""
echo "3. Testing list_resources endpoint (requires auth)..."
curl -s -X POST "$API_URL/list_resources" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{}' | jq '.'

echo ""
echo "4. Testing call_tool endpoint - listing spaces..."
curl -s -X POST "$API_URL/call_tool" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "name": "space_list",
    "arguments": {
      "workspaceId": "01964ade-05e2-7c87-b4e0-fc434e340abb",
      "limit": 10
    }
  }' | jq '.'

echo ""
echo "5. Testing list_prompts endpoint..."
curl -s -X POST "$API_URL/list_prompts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{}' | jq '.'

echo ""
echo "================================="
echo "MCP Standard API tests complete!"
echo ""
echo "To use with Cursor or other AI tools, configure them to connect to:"
echo "$API_URL"
echo ""
echo "Make sure to use a valid API key for authenticated endpoints."
