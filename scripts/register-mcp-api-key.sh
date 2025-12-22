#!/bin/bash
# Script to register an MCP API key using the registration token
#
# The MCP system has been refactored to properly support multi-user systems.
# The API key now contains all necessary authentication context, so you
# don't need to hardcode user/workspace IDs anymore.

# First, get the APP_SECRET from .env
APP_SECRET=$(grep APP_SECRET .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$APP_SECRET" ]; then
  echo "Error: APP_SECRET not found in .env file"
  exit 1
fi

# Prompt for user ID and workspace ID
echo "To create an API key, you need a valid user ID and workspace ID."
echo "These IDs will be associated with the API key for authentication."
echo ""
read -p "Enter user ID: " USER_ID
read -p "Enter workspace ID: " WORKSPACE_ID

# Prompt for API key name or use default
if [ -z "$1" ]; then
  read -p "Enter a name for the API key: " KEY_NAME
else
  KEY_NAME=$1
  echo "Using API key name: $KEY_NAME"
fi

# Make the request to register an API key
echo "Registering API key..."
response=$(curl -s -X POST http://localhost:3000/api/api-keys/register \
  -H "Content-Type: application/json" \
  -H "x-registration-token: $APP_SECRET" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"workspaceId\": \"$WORKSPACE_ID\",
    \"name\": \"$KEY_NAME\"
  }")

# Extract the API key from the response
API_KEY=$(echo $response | grep -o '"key":"[^"]*"' | cut -d'"' -f4)

if [ -n "$API_KEY" ]; then
  echo "API key created successfully: $API_KEY"
  echo "You can now use this key to authenticate with the MCP API."
  
  # Save to a file for easy access
  echo "$API_KEY" > .mcp-api-key
  echo "The API key has been saved to .mcp-api-key"
else
  echo "Error creating API key. Response:"
  echo "$response"
fi 
