-- Script to create test data for MCP Standard integration testing
-- This script creates a test workspace, admin user, and MCP API key

-- Check if the test workspace exists, create if not
INSERT INTO workspaces (id, name, description, hostname, default_role)
VALUES (
    '01964ade-05e2-7c87-b4e0-fc434e340abb'::uuid,
    'MCP Test Workspace',
    'Workspace for testing MCP Standard integration',
    'mcp-test',
    'member'
)
ON CONFLICT (id) DO NOTHING;

-- Create test user with admin privileges
-- Password is 'testpassword123' (you should change this)
-- Note: The password hash below is for 'testpassword123'
INSERT INTO users (id, name, email, password, role, workspace_id, email_verified_at)
VALUES (
    '01964ade-05df-7564-8d5b-7b2dc19f6ff3'::uuid,
    'MCP Test Admin',
    'j.grant@project89.org',
    '$2b$12$uVRmd/J.2LPnC6KSEWKz.ejdwBM53CS32Xz35XOjEC4cHxQHrXis6', -- bcrypt hash of 'testpassword123'
    'admin',
    '01964ade-05e2-7c87-b4e0-fc434e340abb'::uuid,
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    email_verified_at = EXCLUDED.email_verified_at;

-- Create a default space for the workspace (if it doesn't have one)
WITH default_space AS (
    INSERT INTO spaces (id, name, slug, description, workspace_id, visibility, creator_id)
    VALUES (
        gen_uuid_v7(),
        'General',
        'general',
        'Default space for MCP test workspace',
        '01964ade-05e2-7c87-b4e0-fc434e340abb'::uuid,
        'open',
        '01964ade-05df-7564-8d5b-7b2dc19f6ff3'::uuid
    )
    ON CONFLICT DO NOTHING
    RETURNING id
)
UPDATE workspaces 
SET default_space_id = (SELECT id FROM default_space)
WHERE id = '01964ade-05e2-7c87-b4e0-fc434e340abb'::uuid
  AND default_space_id IS NULL;

-- Add the admin user as a member of the default space
INSERT INTO space_members (space_id, user_id, role, added_by_id)
SELECT 
    s.id,
    '01964ade-05df-7564-8d5b-7b2dc19f6ff3'::uuid,
    'admin',
    '01964ade-05df-7564-8d5b-7b2dc19f6ff3'::uuid
FROM spaces s
WHERE s.workspace_id = '01964ade-05e2-7c87-b4e0-fc434e340abb'::uuid
  AND s.slug = 'general'
ON CONFLICT DO NOTHING;

-- Output instructions
SELECT 'Test data created successfully!' as message;
SELECT 'Workspace ID: 01964ade-05e2-7c87-b4e0-fc434e340abb' as info;
SELECT 'User ID: 01964ade-05df-7564-8d5b-7b2dc19f6ff3' as info;
SELECT 'User Email: j.grant@project89.org' as info;
SELECT 'User Password: testpassword123' as info;
SELECT 'User Role: admin' as info;
SELECT '' as info;
SELECT 'To create an MCP API key, run: ./register-mcp-api-key.sh "MCP Test Key"' as next_steps;