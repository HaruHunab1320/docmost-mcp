-- Create test data for MCP Standard API testing
-- This script creates a test workspace, user, and space

-- Create test workspace
INSERT INTO workspaces (
    id, 
    name, 
    hostname, 
    logo,
    created_at, 
    updated_at,
    custom_domain
) VALUES (
    '01964ade-05e2-7c87-b4e0-fc434e340abb',
    'Test Workspace',
    'test-workspace',
    NULL,
    NOW(),
    NOW(),
    NULL
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hostname = EXCLUDED.hostname,
    updated_at = NOW();

-- Create test user (password: testpassword123)
-- Password hash created with bcrypt rounds=10
INSERT INTO users (
    id,
    name,
    email,
    password,
    role,
    workspace_id,
    avatar_url,
    created_at,
    updated_at
) VALUES (
    '01964ade-05df-7564-8d5b-7b2dc19f6ff3',
    'Test User',
    'test@example.com',
    '$2b$10$l724/A2dii/Jz9BOP/Wcnuh7ysj3XgUughvJ/HfEPL9qoAkPvSl/G', -- bcrypt hash of 'testpassword123'
    'admin',
    '01964ade-05e2-7c87-b4e0-fc434e340abb',
    NULL,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = NOW();

-- Create default space
INSERT INTO spaces (
    id,
    name,
    slug,
    description,
    workspace_id,
    creator_id,
    created_at,
    updated_at
) VALUES (
    '01964ade-05e3-7123-a567-123456789abc',
    'General',
    'general',
    'Default space for test workspace',
    '01964ade-05e2-7c87-b4e0-fc434e340abb',
    '01964ade-05df-7564-8d5b-7b2dc19f6ff3',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Add user as space member
INSERT INTO space_members (
    space_id,
    user_id,
    role,
    created_at,
    added_by_id
) VALUES (
    '01964ade-05e3-7123-a567-123456789abc',
    '01964ade-05df-7564-8d5b-7b2dc19f6ff3',
    'admin',
    NOW(),
    '01964ade-05df-7564-8d5b-7b2dc19f6ff3'
) ON CONFLICT (space_id, user_id) DO UPDATE SET
    role = EXCLUDED.role;