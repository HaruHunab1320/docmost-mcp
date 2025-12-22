# MCP Standard Integration Test Data Setup

This directory contains scripts and SQL files to set up test data for testing the MCP Standard integration with Raven Docs.

## Prerequisites

- PostgreSQL database running and accessible
- Node.js installed (for bcrypt password hashing)
- Database migrations already run
- Environment variables configured in `.env` file

## Test Data Details

The test data includes:

- **Workspace**: 
  - ID: `01964ade-05e2-7c87-b4e0-fc434e340abb`
  - Name: "MCP Test Workspace"
  - Hostname: "mcp-test"

- **User**:
  - ID: `01964ade-05df-7564-8d5b-7b2dc19f6ff3`
  - Email: `j.grant@project89.org`
  - Password: `testpassword123`
  - Role: `admin`

- **Default Space**: A "General" space is created for the workspace

## Setup Instructions

### Method 1: Simple Setup (Recommended)

1. Make sure your database is running and accessible
2. Run the setup script:
   ```bash
   ./setup-mcp-test-data-simple.sh
   ```
3. The script will prompt you to create an MCP API key after the data is created

### Method 2: Manual SQL Execution

1. Run the SQL script directly:
   ```bash
   psql "$DATABASE_URL" -f create-test-data.sql
   ```

2. Create an MCP API key:
   ```bash
   ./register-mcp-api-key.sh "MCP Test Key"
   ```

### Method 3: Advanced Setup (with fresh password hash)

If you want to use a different password:

1. Generate a new password hash:
   ```bash
   node generate-password-hash.js "yournewpassword"
   ```

2. Update the hash in `create-test-data.sql`

3. Run the setup script:
   ```bash
   ./setup-mcp-test-data.sh
   ```

## Files Included

- `create-test-data.sql` - SQL script that creates the test workspace, user, and space
- `setup-mcp-test-data-simple.sh` - Simple bash script to run the SQL and optionally create API key
- `setup-mcp-test-data.sh` - Advanced script that generates fresh password hash
- `generate-password-hash.js` - Node.js script to generate bcrypt password hashes
- `register-mcp-api-key.sh` - Existing script to create MCP API keys

## Testing the Setup

After running the setup:

1. Test login with the created user:
   - Email: `j.grant@project89.org`
   - Password: `testpassword123`

2. Use the generated MCP API key (saved in `.mcp-api-key`) to test the MCP API endpoints

3. The test workspace should be accessible at the configured APP_URL with hostname "mcp-test"

## Cleanup

To remove the test data, you can run:

```sql
DELETE FROM workspaces WHERE id = '01964ade-05e2-7c87-b4e0-fc434e340abb';
-- This will cascade delete the user, spaces, and related data
```

## Notes

- The IDs used are UUID v7 format (time-ordered)
- The password is hashed using bcrypt with 12 salt rounds
- The test user has admin privileges in the workspace
- The workspace has a default "General" space created
