#!/bin/bash

# Full MCP Standard API Demo Script
# Shows complete workflow: create space, create page, add comment

API_URL="http://localhost:3000/api/mcp-standard"
API_KEY="${MCP_API_KEY:-your_api_key_here}"
WORKSPACE_ID="01964ade-05e2-7c87-b4e0-fc434e340abb"

echo "MCP Standard API Full Demo"
echo "=========================="
echo "API URL: $API_URL"
echo "Workspace ID: $WORKSPACE_ID"
echo ""

# 1. Create a new space
echo "1. Creating a new space..."
SPACE_RESPONSE=$(curl -s -X POST "$API_URL/call_tool" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "name": "space_create",
    "arguments": {
      "name": "MCP Demo Space",
      "description": "Space created via MCP Standard API",
      "workspaceId": "'$WORKSPACE_ID'"
    }
  }')

echo "$SPACE_RESPONSE" | jq '.'

# Extract space ID from response
SPACE_ID=$(echo "$SPACE_RESPONSE" | jq -r '.data.content[0].text' | jq -r '.id')
echo "Created space with ID: $SPACE_ID"
echo ""

# 2. Create a page in the new space
echo "2. Creating a page in the new space..."
PAGE_RESPONSE=$(curl -s -X POST "$API_URL/call_tool" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "name": "page_create",
    "arguments": {
      "title": "MCP Demo Page",
      "content": {
        "type": "doc",
        "content": [
          {
            "type": "heading",
            "attrs": { "level": 1 },
            "content": [
              { "type": "text", "text": "Welcome to MCP Standard API" }
            ]
          },
          {
            "type": "paragraph",
            "content": [
              { "type": "text", "text": "This page was created using the Model Context Protocol Standard API." }
            ]
          },
          {
            "type": "paragraph",
            "content": [
              { "type": "text", "text": "The MCP Standard API provides a unified interface for AI tools to interact with Raven Docs." }
            ]
          }
        ]
      },
      "spaceId": "'$SPACE_ID'",
      "workspaceId": "'$WORKSPACE_ID'"
    }
  }')

echo "$PAGE_RESPONSE" | jq '.'

# Extract page ID from response
PAGE_ID=$(echo "$PAGE_RESPONSE" | jq -r '.data.content[0].text' | jq -r '.id')
echo "Created page with ID: $PAGE_ID"
echo ""

# 3. Add a comment to the page
echo "3. Adding a comment to the page..."
COMMENT_RESPONSE=$(curl -s -X POST "$API_URL/call_tool" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "name": "comment_create",
    "arguments": {
      "text": "This comment was added via the MCP Standard API!",
      "pageId": "'$PAGE_ID'",
      "workspaceId": "'$WORKSPACE_ID'"
    }
  }')

echo "$COMMENT_RESPONSE" | jq '.'
echo ""

# 4. List all pages in the space
echo "4. Listing pages in the space..."
curl -s -X POST "$API_URL/call_tool" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "name": "page_list",
    "arguments": {
      "spaceId": "'$SPACE_ID'",
      "workspaceId": "'$WORKSPACE_ID'",
      "limit": 10
    }
  }' | jq '.'

echo ""
echo "=========================="
echo "Demo complete!"
echo ""
echo "You can now navigate to the UI to see:"
echo "- New space: 'MCP Demo Space'"
echo "- New page: 'MCP Demo Page' with content"
echo "- Comment on the page"
echo ""
echo "This demonstrates that the MCP Standard API is fully integrated"
echo "and working within the main Raven Docs server."
