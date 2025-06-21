#!/bin/bash
# Simple script to set up test data for MCP Standard integration

echo "Setting up MCP test data..."

# Load environment variables
source .env

# Run the SQL script
echo "Creating test data in database..."
psql "$DATABASE_URL" -f create-test-data.sql

# Check if the data was created successfully
if [ $? -eq 0 ]; then
    echo ""
    echo "Test data created successfully!"
    echo "================================"
    echo "Workspace ID: 01964ade-05e2-7c87-b4e0-fc434e340abb"
    echo "User ID: 01964ade-05df-7564-8d5b-7b2dc19f6ff3"
    echo "User Email: j.grant@project89.org"
    echo "User Password: testpassword123"
    echo "User Role: admin"
    echo ""
    echo "Next step: Create an MCP API key"
    echo "Run: ./register-mcp-api-key.sh 'MCP Test Key'"
    echo ""
    
    # Optionally create the API key automatically
    read -p "Would you like to create the MCP API key now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./register-mcp-api-key.sh "MCP Test Key"
    fi
else
    echo "Error creating test data. Please check the error messages above."
    exit 1
fi