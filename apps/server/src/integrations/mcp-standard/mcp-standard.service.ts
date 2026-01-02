import { Injectable, Logger } from '@nestjs/common';
import { MCPService } from '../mcp/mcp.service';

/**
 * MCP Standard Service
 * 
 * This service translates between the standard Model Context Protocol (MCP)
 * and our internal Master Control Program API.
 */
@Injectable()
export class MCPStandardService {
  private readonly logger = new Logger(MCPStandardService.name);

  constructor(private readonly mcpService: MCPService) {}

  /**
   * Initialize MCP connection
   */
  async initialize(params: any) {
    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {
          subscribe: false,
          listChanged: false,
        },
        prompts: {},
        logging: {},
      },
      serverInfo: {
        name: 'raven-docs',
        version: '1.0.0',
      },
    };
  }

  /**
   * List available tools
   */
  async listTools() {
    this.logger.debug('Listing available MCP tools');
    
    const tools = [
      // Space management
      {
        name: 'space_list',
        description: 'List all spaces in a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            page: { type: 'number', description: 'Page number for pagination' },
            limit: { type: 'number', description: 'Number of items per page' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'space_create',
        description: 'Create a new space',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the space' },
            description: { type: 'string', description: 'Description of the space' },
            slug: { type: 'string', description: 'URL slug for the space' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
          },
          required: ['name', 'workspaceId'],
        },
      },
      {
        name: 'space_get',
        description: 'Get a space by ID',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'ID of the space' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
          },
          required: ['spaceId', 'workspaceId'],
        },
      },
      {
        name: 'space_update',
        description: 'Update an existing space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'ID of the space' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            name: { type: 'string', description: 'New name for the space' },
            description: { type: 'string', description: 'New description' },
            slug: { type: 'string', description: 'New URL slug' },
          },
          required: ['spaceId', 'workspaceId'],
        },
      },
      {
        name: 'space_update_permissions',
        description: 'Update space permissions for a user or group',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'ID of the space' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            targetId: { type: 'string', description: 'User or group ID' },
            role: { type: 'string', description: 'Role to assign' },
            isGroup: {
              type: 'boolean',
              description: 'True when targetId refers to a group',
            },
          },
          required: ['spaceId', 'workspaceId', 'targetId', 'role'],
        },
      },
      {
        name: 'space_members',
        description: 'List members of a space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'ID of the space' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            page: { type: 'number', description: 'Page number for pagination' },
            limit: { type: 'number', description: 'Number of items per page' },
            query: { type: 'string', description: 'Search query' },
          },
          required: ['spaceId', 'workspaceId'],
        },
      },
      {
        name: 'space_members_add',
        description: 'Add members to a space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'ID of the space' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            userIds: {
              type: 'array',
              description: 'User IDs to add',
              items: { type: 'string' },
            },
            groupIds: {
              type: 'array',
              description: 'Group IDs to add',
              items: { type: 'string' },
            },
            role: { type: 'string', description: 'Role to assign' },
          },
          required: ['spaceId', 'workspaceId'],
        },
      },
      {
        name: 'space_members_remove',
        description: 'Remove a member from a space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'ID of the space' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            userId: { type: 'string', description: 'User ID to remove' },
            groupId: { type: 'string', description: 'Group ID to remove' },
          },
          required: ['spaceId', 'workspaceId'],
        },
      },
      {
        name: 'space_change_member_role',
        description: 'Change a space member role',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'ID of the space' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            userId: { type: 'string', description: 'User ID' },
            role: { type: 'string', description: 'New role' },
          },
          required: ['spaceId', 'workspaceId', 'userId', 'role'],
        },
      },
      {
        name: 'space_delete',
        description: 'Delete a space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'ID of the space to delete' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
          },
          required: ['spaceId', 'workspaceId'],
        },
      },

      // Page management
      {
        name: 'page_list',
        description: 'List pages in a space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'ID of the space' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            page: { type: 'number', description: 'Page number for pagination' },
            limit: { type: 'number', description: 'Number of items per page' },
          },
          required: ['spaceId', 'workspaceId'],
        },
      },
      {
        name: 'page_get',
        description: 'Get a page by ID',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: { type: 'string', description: 'ID of the page' },
          },
          required: ['pageId'],
        },
      },
      {
        name: 'page_create',
        description: 'Create a new page',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of the page' },
            content: {
              type: 'object',
              description: 'Page content in ProseMirror format',
              properties: {
                type: { type: 'string' },
                content: { type: 'array' },
              },
            },
            spaceId: { type: 'string', description: 'ID of the space' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            parentId: { type: 'string', description: 'ID of the parent page' },
          },
          required: ['title', 'content', 'spaceId', 'workspaceId'],
        },
      },
      {
        name: 'page_update',
        description: 'Update an existing page',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: { type: 'string', description: 'ID of the page' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            title: { type: 'string', description: 'New title' },
            content: {
              type: 'object',
              description: 'New content in ProseMirror format',
              properties: {
                type: { type: 'string' },
                content: { type: 'array' },
              },
            },
            parentId: { type: 'string', description: 'New parent page ID' },
          },
          required: ['pageId', 'workspaceId'],
        },
      },
      {
        name: 'page_delete',
        description: 'Delete a page',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: { type: 'string', description: 'ID of the page to delete' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
          },
          required: ['pageId', 'workspaceId'],
        },
      },
      {
        name: 'page_move',
        description: 'Move a page to a different location',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: { type: 'string', description: 'ID of the page to move' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            parentId: { type: ['string', 'null'], description: 'New parent page ID' },
            spaceId: { type: 'string', description: 'Target space ID' },
          },
          required: ['pageId', 'workspaceId'],
        },
      },
      {
        name: 'page_search',
        description: 'Search pages',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            spaceId: { type: 'string', description: 'Optional space ID' },
            page: { type: 'number', description: 'Page number for pagination' },
            limit: { type: 'number', description: 'Number of items per page' },
          },
          required: ['query'],
        },
      },
      {
        name: 'page_get_history',
        description: 'Get page history',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: { type: 'string', description: 'ID of the page' },
            page: { type: 'number', description: 'Page number for pagination' },
            limit: { type: 'number', description: 'Number of items per page' },
          },
          required: ['pageId'],
        },
      },
      {
        name: 'page_history_info',
        description: 'Get page history details',
        inputSchema: {
          type: 'object',
          properties: {
            historyId: { type: 'string', description: 'History version ID' },
          },
          required: ['historyId'],
        },
      },
      {
        name: 'page_restore',
        description: 'Restore a page history version',
        inputSchema: {
          type: 'object',
          properties: {
            historyId: { type: 'string', description: 'Page history version ID' },
          },
          required: ['historyId'],
        },
      },
      {
        name: 'page_recent',
        description: 'List recent pages',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'Optional space ID' },
            page: { type: 'number', description: 'Page number for pagination' },
            limit: {
              type: 'number',
              description: 'Number of items per page',
            },
            query: { type: 'string', description: 'Search query' },
          },
        },
      },
      {
        name: 'page_breadcrumbs',
        description: 'Get page breadcrumbs',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: { type: 'string', description: 'ID of the page' },
          },
          required: ['pageId'],
        },
      },
      {
        name: 'page_sidebar_pages',
        description: 'List sidebar pages for a space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'ID of the space' },
            pageId: { type: 'string', description: 'Current page ID' },
            page: { type: 'number', description: 'Page number for pagination' },
            limit: {
              type: 'number',
              description: 'Number of items per page',
            },
            query: { type: 'string', description: 'Search query' },
          },
          required: ['spaceId'],
        },
      },
      {
        name: 'page_move_to_space',
        description: 'Move a page to another space',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: { type: 'string', description: 'ID of the page' },
            spaceId: { type: 'string', description: 'Target space ID' },
          },
          required: ['pageId', 'spaceId'],
        },
      },

      // Project management
      {
        name: 'project_list',
        description: 'List projects in a space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'ID of the space' },
            page: { type: 'number', description: 'Page number for pagination' },
            limit: { type: 'number', description: 'Number of items per page' },
            includeArchived: {
              type: 'boolean',
              description: 'Include archived projects',
            },
            searchTerm: { type: 'string', description: 'Search term' },
          },
          required: ['spaceId'],
        },
      },
      {
        name: 'project_get',
        description: 'Get a project by ID',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'ID of the project' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'project_create',
        description: 'Create a new project',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Project name' },
            description: { type: 'string', description: 'Project description' },
            spaceId: { type: 'string', description: 'ID of the space' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            icon: { type: 'string', description: 'Project icon' },
            color: { type: 'string', description: 'Project color' },
            startDate: { type: 'string', description: 'Start date (ISO)' },
            endDate: { type: 'string', description: 'End date (ISO)' },
          },
          required: ['name', 'spaceId', 'workspaceId'],
        },
      },
      {
        name: 'project_update',
        description: 'Update a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'ID of the project' },
            name: { type: 'string', description: 'Project name' },
            description: { type: 'string', description: 'Project description' },
            icon: { type: 'string', description: 'Project icon' },
            color: { type: 'string', description: 'Project color' },
            coverImage: { type: 'string', description: 'Cover image URL' },
            startDate: { type: 'string', description: 'Start date (ISO)' },
            endDate: { type: 'string', description: 'End date (ISO)' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'project_archive',
        description: 'Archive or unarchive a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'ID of the project' },
            isArchived: { type: 'boolean', description: 'Archive state' },
          },
          required: ['projectId', 'isArchived'],
        },
      },
      {
        name: 'project_delete',
        description: 'Delete a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'ID of the project' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'project_create_page',
        description: 'Create a project home page (if missing)',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'ID of the project' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
          },
          required: ['projectId', 'workspaceId'],
        },
      },

      // Task management
      {
        name: 'task_list',
        description: 'List tasks by project or space',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'ID of the project' },
            spaceId: { type: 'string', description: 'ID of the space' },
            page: { type: 'number', description: 'Page number for pagination' },
            limit: { type: 'number', description: 'Number of items per page' },
            status: {
              type: 'array',
              description: 'Filter by status',
              items: {
                type: 'string',
                enum: ['todo', 'in_progress', 'in_review', 'done', 'blocked'],
              },
            },
            bucket: {
              type: 'array',
              description: 'Filter by bucket',
              items: {
                type: 'string',
                enum: ['none', 'inbox', 'waiting', 'someday'],
              },
            },
            searchTerm: { type: 'string', description: 'Search term' },
            includeSubtasks: {
              type: 'boolean',
              description: 'Include subtasks (project list only)',
            },
          },
        },
      },
      {
        name: 'task_get',
        description: 'Get a task by ID',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'ID of the task' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'task_create',
        description: 'Create a new task',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Task title' },
            description: { type: 'string', description: 'Task description' },
            status: {
              type: 'string',
              enum: ['todo', 'in_progress', 'in_review', 'done', 'blocked'],
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
            },
            bucket: {
              type: 'string',
              enum: ['none', 'inbox', 'waiting', 'someday'],
            },
            dueDate: { type: 'string', description: 'Due date (ISO)' },
            projectId: { type: 'string', description: 'Project ID' },
            parentTaskId: { type: 'string', description: 'Parent task ID' },
            pageId: { type: 'string', description: 'Linked page ID' },
            assigneeId: { type: 'string', description: 'Assignee user ID' },
            spaceId: { type: 'string', description: 'Space ID' },
            workspaceId: { type: 'string', description: 'Workspace ID' },
            estimatedTime: { type: 'number', description: 'Estimated time' },
          },
          required: ['title', 'spaceId', 'workspaceId'],
        },
      },
      {
        name: 'task_update',
        description: 'Update a task',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'ID of the task' },
            title: { type: 'string', description: 'Task title' },
            description: { type: 'string', description: 'Task description' },
            status: {
              type: 'string',
              enum: ['todo', 'in_progress', 'in_review', 'done', 'blocked'],
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
            },
            bucket: {
              type: 'string',
              enum: ['none', 'inbox', 'waiting', 'someday'],
            },
            dueDate: { type: 'string', description: 'Due date (ISO)' },
            assigneeId: { type: 'string', description: 'Assignee user ID' },
            pageId: { type: 'string', description: 'Linked page ID' },
            estimatedTime: { type: 'number', description: 'Estimated time' },
            position: { type: 'string', description: 'Position key' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'task_delete',
        description: 'Delete a task',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'ID of the task' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'task_complete',
        description: 'Mark a task complete or incomplete',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'ID of the task' },
            isCompleted: {
              type: 'boolean',
              description: 'Completion state',
            },
          },
          required: ['taskId', 'isCompleted'],
        },
      },
      {
        name: 'task_assign',
        description: 'Assign or unassign a task',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'ID of the task' },
            assigneeId: {
              type: ['string', 'null'],
              description: 'Assignee user ID',
            },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'task_move_to_project',
        description: 'Move a task to another project (or remove from project)',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'ID of the task' },
            projectId: {
              type: ['string', 'null'],
              description: 'Target project ID',
            },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'task_bucket_set',
        description: 'Set a task bucket',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'ID of the task' },
            bucket: {
              type: 'string',
              enum: ['none', 'inbox', 'waiting', 'someday'],
              description: 'Bucket name',
            },
          },
          required: ['taskId', 'bucket'],
        },
      },
      {
        name: 'task_bucket_clear',
        description: 'Clear a task bucket (set to none)',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'ID of the task' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'task_triage_summary',
        description: 'Get a daily triage summary for a space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'ID of the space' },
            limit: { type: 'number', description: 'Items per list' },
          },
          required: ['spaceId'],
        },
      },

      // User management
      {
        name: 'user_list',
        description: 'List users in a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Items per page' },
            query: { type: 'string', description: 'Search query' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'user_get',
        description: 'Get user details',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'ID of the user' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
          },
          required: ['userId', 'workspaceId'],
        },
      },
      {
        name: 'user_update',
        description: 'Update user information',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'ID of the user' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            name: { type: 'string', description: 'New name' },
            role: { type: 'string', description: 'New role' },
            avatarUrl: { type: 'string', description: 'New avatar URL' },
          },
          required: ['userId', 'workspaceId'],
        },
      },

      // Comment management
      {
        name: 'comment_create',
        description: 'Create a new comment',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text content of the comment' },
            pageId: { type: 'string', description: 'ID of the page' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            parentCommentId: { type: 'string', description: 'ID of parent comment for replies' },
          },
          required: ['text', 'pageId', 'workspaceId'],
        },
      },
      {
        name: 'comment_list',
        description: 'List comments on a page',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: { type: 'string', description: 'ID of the page' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Items per page' },
          },
          required: ['pageId', 'workspaceId'],
        },
      },
      {
        name: 'comment_get',
        description: 'Get a comment by ID',
        inputSchema: {
          type: 'object',
          properties: {
            commentId: { type: 'string', description: 'ID of the comment' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
          },
          required: ['commentId', 'workspaceId'],
        },
      },
      {
        name: 'comment_update',
        description: 'Update a comment',
        inputSchema: {
          type: 'object',
          properties: {
            commentId: { type: 'string', description: 'ID of the comment' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            content: {
              type: 'object',
              properties: {
                text: { type: 'string', description: 'New text content' },
              },
              required: ['text'],
            },
          },
          required: ['commentId', 'workspaceId', 'content'],
        },
      },
      {
        name: 'comment_delete',
        description: 'Delete a comment',
        inputSchema: {
          type: 'object',
          properties: {
            commentId: { type: 'string', description: 'ID of the comment' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
          },
          required: ['commentId', 'workspaceId'],
        },
      },
      {
        name: 'comment_resolve',
        description: 'Resolve or unresolve a comment',
        inputSchema: {
          type: 'object',
          properties: {
            commentId: { type: 'string', description: 'ID of the comment' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            resolved: { type: 'boolean', description: 'Resolve state' },
          },
          required: ['commentId', 'workspaceId', 'resolved'],
        },
      },

      // Group management
      {
        name: 'group_create',
        description: 'Create a new group',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the group' },
            description: { type: 'string', description: 'Description' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
          },
          required: ['name', 'workspaceId'],
        },
      },
      {
        name: 'group_list',
        description: 'List groups in workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Items per page' },
            query: { type: 'string', description: 'Search query' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'group_get',
        description: 'Get a group by ID',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'ID of the group' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
          },
          required: ['groupId', 'workspaceId'],
        },
      },
      {
        name: 'group_update',
        description: 'Update a group',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'ID of the group' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            name: { type: 'string', description: 'New name' },
            description: { type: 'string', description: 'New description' },
          },
          required: ['groupId', 'workspaceId'],
        },
      },
      {
        name: 'group_delete',
        description: 'Delete a group',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'ID of the group' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
          },
          required: ['groupId', 'workspaceId'],
        },
      },
      {
        name: 'group_addMember',
        description: 'Add a member to a group',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'ID of the group' },
            userId: { type: 'string', description: 'ID of the user' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
          },
          required: ['groupId', 'userId', 'workspaceId'],
        },
      },
      {
        name: 'group_remove_member',
        description: 'Remove a member from a group',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'ID of the group' },
            userId: { type: 'string', description: 'ID of the user' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
          },
          required: ['groupId', 'userId', 'workspaceId'],
        },
      },

      // Workspace management
      {
        name: 'workspace_list',
        description: 'List workspaces available to the user',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'workspace_get',
        description: 'Get workspace details',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'workspace_create',
        description: 'Create a new workspace',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Workspace name' },
            description: { type: 'string', description: 'Workspace description' },
            hostname: { type: 'string', description: 'Workspace hostname' },
          },
          required: ['name'],
        },
      },
      {
        name: 'workspace_update',
        description: 'Update a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            name: { type: 'string', description: 'Workspace name' },
            description: { type: 'string', description: 'Workspace description' },
            hostname: { type: 'string', description: 'Workspace hostname' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'workspace_delete',
        description: 'Delete a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'workspace_add_member',
        description: 'Invite a member to a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            email: {
              type: ['string', 'array'],
              description: 'Email address or list of emails',
            },
            role: { type: 'string', description: 'Role for the invitee' },
            groupIds: {
              type: 'array',
              description: 'Group IDs to add the user to',
              items: { type: 'string' },
            },
          },
          required: ['workspaceId', 'email'],
        },
      },
      {
        name: 'workspace_remove_member',
        description: 'Remove a member from a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            userId: { type: 'string', description: 'ID of the user' },
          },
          required: ['workspaceId', 'userId'],
        },
      },
      {
        name: 'workspace_members',
        description: 'List workspace members',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Items per page' },
            query: { type: 'string', description: 'Search query' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'workspace_change_member_role',
        description: 'Change a workspace member role',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            userId: { type: 'string', description: 'ID of the user' },
            role: { type: 'string', description: 'New role' },
          },
          required: ['workspaceId', 'userId', 'role'],
        },
      },
      {
        name: 'workspace_delete_member',
        description: 'Delete a workspace member',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            userId: { type: 'string', description: 'ID of the user' },
          },
          required: ['workspaceId', 'userId'],
        },
      },
      {
        name: 'workspace_invites',
        description: 'List workspace invites',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Items per page' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'workspace_invite_info',
        description: 'Get workspace invite info',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            invitationId: { type: 'string', description: 'Invitation ID' },
          },
          required: ['workspaceId', 'invitationId'],
        },
      },
      {
        name: 'workspace_invite_create',
        description: 'Create workspace invites',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            emails: {
              type: 'array',
              description: 'Email addresses to invite',
              items: { type: 'string' },
            },
            role: { type: 'string', description: 'Role to assign' },
            groupIds: {
              type: 'array',
              description: 'Group IDs to add',
              items: { type: 'string' },
            },
          },
          required: ['workspaceId', 'emails'],
        },
      },
      {
        name: 'workspace_invite_resend',
        description: 'Resend a workspace invite',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            invitationId: { type: 'string', description: 'Invitation ID' },
          },
          required: ['workspaceId', 'invitationId'],
        },
      },
      {
        name: 'workspace_invite_revoke',
        description: 'Revoke a workspace invite',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            invitationId: { type: 'string', description: 'Invitation ID' },
          },
          required: ['workspaceId', 'invitationId'],
        },
      },
      {
        name: 'workspace_invite_link',
        description: 'Get a workspace invite link',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            invitationId: { type: 'string', description: 'Invitation ID' },
          },
          required: ['workspaceId', 'invitationId'],
        },
      },
      {
        name: 'workspace_check_hostname',
        description: 'Check hostname availability',
        inputSchema: {
          type: 'object',
          properties: {
            hostname: { type: 'string', description: 'Hostname to check' },
          },
          required: ['hostname'],
        },
      },

      // Attachment management
      {
        name: 'attachment_list',
        description: 'List attachments',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            spaceId: { type: 'string', description: 'ID of the space' },
            pageId: { type: 'string', description: 'ID of the page' },
            type: { type: 'string', description: 'Attachment type' },
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Items per page' },
            query: { type: 'string', description: 'Search query' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'attachment_get',
        description: 'Get attachment details',
        inputSchema: {
          type: 'object',
          properties: {
            attachmentId: { type: 'string', description: 'ID of the attachment' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
          },
          required: ['attachmentId', 'workspaceId'],
        },
      },
      {
        name: 'attachment_upload',
        description: 'Upload an attachment to a page (base64)',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            pageId: { type: 'string', description: 'ID of the page' },
            fileName: { type: 'string', description: 'File name' },
            fileContent: { type: 'string', description: 'Base64 content' },
            mimeType: { type: 'string', description: 'MIME type' },
            attachmentId: { type: 'string', description: 'Optional attachment ID' },
          },
          required: ['workspaceId', 'pageId', 'fileName', 'fileContent'],
        },
      },
      {
        name: 'attachment_download',
        description: 'Download an attachment (base64)',
        inputSchema: {
          type: 'object',
          properties: {
            attachmentId: { type: 'string', description: 'ID of the attachment' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            includeDataUrl: {
              type: 'boolean',
              description: 'Include data URL prefix',
            },
          },
          required: ['attachmentId', 'workspaceId'],
        },
      },
      {
        name: 'attachment_delete',
        description: 'Delete an attachment',
        inputSchema: {
          type: 'object',
          properties: {
            attachmentId: { type: 'string', description: 'ID of the attachment' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
          },
          required: ['attachmentId', 'workspaceId'],
        },
      },

      // Search
      {
        name: 'search_query',
        description: 'Search pages across spaces or within a space',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            spaceId: { type: 'string', description: 'Space ID' },
            creatorId: { type: 'string', description: 'Creator user ID' },
            limit: { type: 'number', description: 'Limit results' },
            offset: { type: 'number', description: 'Offset results' },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_suggest',
        description: 'Get search suggestions',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            workspaceId: { type: 'string', description: 'Workspace ID' },
            spaceId: { type: 'string', description: 'Optional space ID' },
            includeUsers: { type: 'boolean', description: 'Include users' },
            includeGroups: { type: 'boolean', description: 'Include groups' },
            includePages: { type: 'boolean', description: 'Include pages' },
            limit: { type: 'number', description: 'Limit results' },
          },
          required: ['query', 'workspaceId'],
        },
      },

      // Import
      {
        name: 'import_request_upload',
        description: 'Request a presigned upload URL for imports',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'Workspace ID' },
            fileName: { type: 'string', description: 'File name' },
            mimeType: { type: 'string', description: 'MIME type' },
            expiresIn: { type: 'number', description: 'TTL in seconds' },
          },
          required: ['workspaceId', 'fileName'],
        },
      },
      {
        name: 'import_page',
        description: 'Import a page from a stored file',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'Workspace ID' },
            spaceId: { type: 'string', description: 'Space ID' },
            filePath: { type: 'string', description: 'Storage file path' },
          },
          required: ['workspaceId', 'spaceId', 'filePath'],
        },
      },

      // Export
      {
        name: 'export_page',
        description: 'Export a page and return a download URL',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: { type: 'string', description: 'Page ID' },
            format: { type: 'string', description: 'Export format' },
            includeChildren: {
              type: 'boolean',
              description: 'Include child pages',
            },
            expiresIn: { type: 'number', description: 'TTL in seconds' },
          },
          required: ['pageId', 'format'],
        },
      },
      {
        name: 'export_space',
        description: 'Export a space and return a download URL',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'Space ID' },
            format: { type: 'string', description: 'Export format' },
            includeAttachments: {
              type: 'boolean',
              description: 'Include attachments',
            },
            expiresIn: { type: 'number', description: 'TTL in seconds' },
          },
          required: ['spaceId', 'format'],
        },
      },

      // Approvals
      {
        name: 'approval_request',
        description: 'Request approval for a sensitive MCP operation',
        inputSchema: {
          type: 'object',
          properties: {
            method: { type: 'string', description: 'MCP method name' },
            params: {
              type: 'object',
              description: 'Parameters for the requested method',
            },
            ttlSeconds: { type: 'number', description: 'TTL in seconds' },
          },
          required: ['method'],
        },
      },
      {
        name: 'approval_confirm',
        description: 'Confirm an approval token',
        inputSchema: {
          type: 'object',
          properties: {
            approvalToken: {
              type: 'string',
              description: 'Approval token to confirm',
            },
            method: { type: 'string', description: 'MCP method name' },
            params: {
              type: 'object',
              description: 'Parameters for the requested method',
            },
          },
          required: ['approvalToken', 'method'],
        },
      },

      // AI
      {
        name: 'ai_generate',
        description: 'Generate content with Gemini models',
        inputSchema: {
          type: 'object',
          properties: {
            model: { type: 'string', description: 'Gemini model name' },
            contents: {
              type: 'array',
              description: 'Gemini contents payload',
            },
            generationConfig: {
              type: 'object',
              description: 'Generation configuration',
            },
            safetySettings: {
              type: 'array',
              description: 'Safety settings',
            },
            tools: {
              type: 'array',
              description: 'Tools configuration',
            },
            toolConfig: {
              type: 'object',
              description: 'Tool config',
            },
          },
          required: ['model', 'contents'],
        },
      },

      // Memory
      {
        name: 'memory_ingest',
        description: 'Store a new memory entry for the agent',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            spaceId: { type: 'string', description: 'Optional space ID' },
            source: {
              type: 'string',
              description: 'Source identifier for the memory',
            },
            content: {
              description: 'Structured content payload for the memory',
            },
            summary: { type: 'string', description: 'Short summary' },
            tags: {
              type: 'array',
              description: 'Tags for filtering',
              items: { type: 'string' },
            },
            timestamp: {
              type: 'string',
              description: 'ISO-8601 timestamp for the memory',
            },
            entities: {
              type: 'array',
              description: 'Entities referenced in the memory',
            },
          },
          required: ['workspaceId', 'source'],
        },
      },
      {
        name: 'memory_query',
        description: 'Query stored memories with optional semantic search',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            spaceId: { type: 'string', description: 'Optional space ID' },
            query: { type: 'string', description: 'Semantic query text' },
            tags: {
              type: 'array',
              description: 'Filter by tags',
              items: { type: 'string' },
            },
            from: { type: 'string', description: 'ISO-8601 start date' },
            to: { type: 'string', description: 'ISO-8601 end date' },
            limit: { type: 'number', description: 'Max results' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'memory_daily',
        description: 'Fetch daily memories for a specific date',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            spaceId: { type: 'string', description: 'Optional space ID' },
            date: { type: 'string', description: 'ISO-8601 date' },
            limit: { type: 'number', description: 'Max results' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'memory_days',
        description: 'List recent days with memory activity',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'ID of the workspace' },
            spaceId: { type: 'string', description: 'Optional space ID' },
            days: { type: 'number', description: 'Number of days to return' },
          },
          required: ['workspaceId'],
        },
      },

      // Navigation
      {
        name: 'ui_navigate',
        description: 'Navigate to a specific location in the UI',
        inputSchema: {
          type: 'object',
          properties: {
            destination: {
              type: 'string',
              enum: ['space', 'page', 'home', 'dashboard'],
              description: 'Navigation destination',
            },
            spaceId: { type: 'string', description: 'Space ID for navigation' },
            spaceSlug: { type: 'string', description: 'Space slug for navigation' },
            pageId: { type: 'string', description: 'Page ID for navigation' },
            pageSlug: { type: 'string', description: 'Page slug for navigation' },
            workspaceId: { type: 'string', description: 'ID of the workspace' },
          },
          required: ['destination', 'workspaceId'],
        },
      },

      // System
      {
        name: 'system_list_methods',
        description: 'List available MCP methods',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'system_get_method_schema',
        description: 'Get MCP method schema',
        inputSchema: {
          type: 'object',
          properties: {
            method: { type: 'string', description: 'Method name' },
          },
          required: ['method'],
        },
      },

      // Context
      {
        name: 'context_set',
        description: 'Set a context value for the session',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Context key' },
            value: { type: 'string', description: 'Context value' },
            ttlSeconds: { type: 'number', description: 'TTL in seconds' },
          },
          required: ['key', 'value'],
        },
      },
      {
        name: 'context_get',
        description: 'Get a context value by key',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Context key' },
          },
          required: ['key'],
        },
      },
      {
        name: 'context_delete',
        description: 'Delete a context key',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Context key' },
          },
          required: ['key'],
        },
      },
      {
        name: 'context_list',
        description: 'List context keys',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'context_clear',
        description: 'Clear all context values for the session',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];

    return { tools };
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: any, user: any) {
    this.logger.debug(`Calling tool ${name} with args:`, args);

    // Map standard MCP tool names to our internal methods
    const toolToMethod: Record<string, string> = {
      'space_list': 'space.list',
      'space_get': 'space.get',
      'space_create': 'space.create',
      'space_update': 'space.update',
      'space_update_permissions': 'space.updatePermissions',
      'space_members': 'space.members',
      'space_members_add': 'space.membersAdd',
      'space_members_remove': 'space.membersRemove',
      'space_change_member_role': 'space.changeMemberRole',
      'space_delete': 'space.delete',
      'page_list': 'page.list',
      'page_get': 'page.get',
      'page_create': 'page.create',
      'page_update': 'page.update',
      'page_delete': 'page.delete',
      'page_move': 'page.move',
      'page_search': 'page.search',
      'page_get_history': 'page.getHistory',
      'page_history_info': 'page.historyInfo',
      'page_restore': 'page.restore',
      'page_recent': 'page.recent',
      'page_breadcrumbs': 'page.breadcrumbs',
      'page_sidebar_pages': 'page.sidebarPages',
      'page_move_to_space': 'page.moveToSpace',
      'project_list': 'project.list',
      'project_get': 'project.get',
      'project_create': 'project.create',
      'project_update': 'project.update',
      'project_archive': 'project.archive',
      'project_delete': 'project.delete',
      'project_create_page': 'project.createPage',
      'task_list': 'task.list',
      'task_get': 'task.get',
      'task_create': 'task.create',
      'task_update': 'task.update',
      'task_delete': 'task.delete',
      'task_complete': 'task.complete',
      'task_assign': 'task.assign',
      'task_move_to_project': 'task.moveToProject',
      'task_bucket_set': 'task.update',
      'task_bucket_clear': 'task.update',
      'task_triage_summary': 'task.triageSummary',
      'user_list': 'user.list',
      'user_get': 'user.get',
      'user_update': 'user.update',
      'comment_create': 'comment.create',
      'comment_get': 'comment.get',
      'comment_list': 'comment.list',
      'comment_update': 'comment.update',
      'comment_delete': 'comment.delete',
      'comment_resolve': 'comment.resolve',
      'group_create': 'group.create',
      'group_list': 'group.list',
      'group_get': 'group.get',
      'group_update': 'group.update',
      'group_delete': 'group.delete',
      'group_addMember': 'group.addMember',
      'group_remove_member': 'group.removeMember',
      'workspace_list': 'workspace.list',
      'workspace_get': 'workspace.get',
      'workspace_create': 'workspace.create',
      'workspace_update': 'workspace.update',
      'workspace_delete': 'workspace.delete',
      'workspace_add_member': 'workspace.addMember',
      'workspace_remove_member': 'workspace.removeMember',
      'workspace_members': 'workspace.members',
      'workspace_change_member_role': 'workspace.changeMemberRole',
      'workspace_delete_member': 'workspace.deleteMember',
      'workspace_invites': 'workspace.invites',
      'workspace_invite_info': 'workspace.inviteInfo',
      'workspace_invite_create': 'workspace.inviteCreate',
      'workspace_invite_resend': 'workspace.inviteResend',
      'workspace_invite_revoke': 'workspace.inviteRevoke',
      'workspace_invite_link': 'workspace.inviteLink',
      'workspace_check_hostname': 'workspace.checkHostname',
      'attachment_list': 'attachment.list',
      'attachment_get': 'attachment.get',
      'attachment_upload': 'attachment.upload',
      'attachment_download': 'attachment.download',
      'attachment_delete': 'attachment.delete',
      'search_query': 'search.query',
      'search_suggest': 'search.suggest',
      'import_request_upload': 'import.requestUpload',
      'import_page': 'import.page',
      'export_page': 'export.page',
      'export_space': 'export.space',
      'approval_request': 'approval.request',
      'approval_confirm': 'approval.confirm',
      'ai_generate': 'ai.generate',
      'memory_ingest': 'memory.ingest',
      'memory_query': 'memory.query',
      'memory_daily': 'memory.daily',
      'memory_days': 'memory.days',
      'ui_navigate': 'ui.navigate',
      'system_list_methods': 'system.listMethods',
      'system_get_method_schema': 'system.getMethodSchema',
      'context_set': 'context.set',
      'context_get': 'context.get',
      'context_delete': 'context.delete',
      'context_list': 'context.list',
      'context_clear': 'context.clear',
    };

    const method = toolToMethod[name];
    if (!method) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Handle special parameter transformations
    let params = { ...args };

    // Transform comment parameters
    if (name === 'comment_create' && params.text) {
      params.content = { text: params.text };
      delete params.text;
    }

    // Transform group.addMember parameters
    if (name === 'group_addMember' && params.userId) {
      params.userIds = [params.userId];
    }

    // Transform page.move parameters
    if (name === 'page_move' && params.spaceId) {
      params.targetSpaceId = params.spaceId;
      delete params.spaceId;
    }

    // Transform system.getMethodSchema parameters
    if (name === 'system_get_method_schema' && params.method) {
      params.methodName = params.method;
      delete params.method;
    }

    // Transform context.set parameters
    if (name === 'context_set' && params.ttlSeconds !== undefined) {
      params.ttl = params.ttlSeconds;
      delete params.ttlSeconds;
    }

    // Transform task bucket helpers
    if (name === 'task_bucket_set') {
      params = { taskId: params.taskId, bucket: params.bucket };
    }

    if (name === 'task_bucket_clear') {
      params = { taskId: params.taskId, bucket: 'none' };
    }

    // Call the internal MCP service
    const result = await this.mcpService.processRequest({
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now(),
    }, user);

    // Return in standard MCP format
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result.result || result, null, 2),
        },
      ],
    };
  }

  /**
   * List available resources
   */
  async listResources() {
    return {
      resources: [
        {
          uri: 'ravendocs://spaces',
          name: 'Spaces',
          description: 'All spaces in the workspace',
          mimeType: 'application/json',
        },
        {
          uri: 'ravendocs://pages',
          name: 'Pages',
          description: 'All pages across all spaces',
          mimeType: 'application/json',
        },
        {
          uri: 'ravendocs://projects',
          name: 'Projects',
          description: 'All projects across all spaces',
          mimeType: 'application/json',
        },
        {
          uri: 'ravendocs://tasks',
          name: 'Tasks',
          description: 'All tasks across all spaces',
          mimeType: 'application/json',
        },
        {
          uri: 'ravendocs://users',
          name: 'Users',
          description: 'All users in the workspace',
          mimeType: 'application/json',
        },
      ],
    };
  }

  /**
   * Read a resource
   */
  async readResource(uri: string, user: any) {
    this.logger.debug(`Reading resource: ${uri}`);

    const resourceHandlers: Record<string, () => Promise<any>> = {
      'ravendocs://spaces': async () => {
        const result = await this.mcpService.processRequest({
          jsonrpc: '2.0',
          method: 'space.list',
          params: { limit: 100 },
          id: Date.now(),
        }, user);
        return result.result;
      },
      'ravendocs://pages': async () => {
        const result = await this.mcpService.processRequest({
          jsonrpc: '2.0',
          method: 'page.list',
          params: { limit: 100 },
          id: Date.now(),
        }, user);
        return result.result;
      },
      'ravendocs://projects': async () => {
        const spacesResult = await this.mcpService.processRequest({
          jsonrpc: '2.0',
          method: 'space.list',
          params: { workspaceId: user.workspaceId, limit: 100 },
          id: Date.now(),
        }, user);
        const spaces = spacesResult.result?.spaces || [];

        const projectResponses = await Promise.all(
          spaces.map((space: any) =>
            this.mcpService.processRequest({
              jsonrpc: '2.0',
              method: 'project.list',
              params: { spaceId: space.id, limit: 100 },
              id: Date.now(),
            }, user),
          ),
        );

        const projects = projectResponses.flatMap(
          (response) => response.result?.projects || [],
        );

        return { projects };
      },
      'ravendocs://tasks': async () => {
        const spacesResult = await this.mcpService.processRequest({
          jsonrpc: '2.0',
          method: 'space.list',
          params: { workspaceId: user.workspaceId, limit: 100 },
          id: Date.now(),
        }, user);
        const spaces = spacesResult.result?.spaces || [];

        const taskResponses = await Promise.all(
          spaces.map((space: any) =>
            this.mcpService.processRequest({
              jsonrpc: '2.0',
              method: 'task.list',
              params: { spaceId: space.id, limit: 100 },
              id: Date.now(),
            }, user),
          ),
        );

        const tasks = taskResponses.flatMap(
          (response) => response.result?.tasks || [],
        );

        return { tasks };
      },
      'ravendocs://users': async () => {
        const result = await this.mcpService.processRequest({
          jsonrpc: '2.0',
          method: 'user.list',
          params: { limit: 100 },
          id: Date.now(),
        }, user);
        return result.result;
      },
    };

    const handler = resourceHandlers[uri];
    if (!handler) {
      throw new Error(`Unknown resource: ${uri}`);
    }

    const contents = await handler();
    
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(contents, null, 2),
        },
      ],
    };
  }

  /**
   * Subscribe to resource updates
   */
  async subscribe(uri: string, user: any) {
    this.logger.debug(`Subscribing to resource: ${uri}`);
    // For now, we don't support real-time subscriptions
    return { subscribed: true };
  }

  /**
   * Unsubscribe from resource updates
   */
  async unsubscribe(uri: string, user: any) {
    this.logger.debug(`Unsubscribing from resource: ${uri}`);
    return { unsubscribed: true };
  }

  /**
   * Complete text (not implemented for now)
   */
  async complete(params: any, user: any) {
    this.logger.debug('Text completion requested');
    return {
      completion: {
        values: [],
        total: 0,
        hasMore: false,
      },
    };
  }

  /**
   * List available prompts
   */
  async listPrompts() {
    return {
      prompts: [
        {
          name: 'create_documentation',
          description: 'Create documentation for a feature or API',
          arguments: [
            {
              name: 'topic',
              description: 'The topic to document',
              required: true,
            },
          ],
        },
      ],
    };
  }

  /**
   * Get a specific prompt
   */
  async getPrompt(name: string, args: any) {
    if (name === 'create_documentation') {
      return {
        prompt: {
          name: 'create_documentation',
          arguments: args,
          messages: [
            {
              role: 'system',
              content: `Create comprehensive documentation for: ${args.topic}`,
            },
          ],
        },
      };
    }
    
    throw new Error(`Unknown prompt: ${name}`);
  }
}
