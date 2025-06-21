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
        name: 'docmost',
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
      'space_create': 'space.create',
      'space_update': 'space.update',
      'space_delete': 'space.delete',
      'page_list': 'page.list',
      'page_create': 'page.create',
      'page_update': 'page.update',
      'page_delete': 'page.delete',
      'page_move': 'page.move',
      'user_list': 'user.list',
      'user_get': 'user.get',
      'user_update': 'user.update',
      'comment_create': 'comment.create',
      'comment_list': 'comment.list',
      'comment_update': 'comment.update',
      'comment_delete': 'comment.delete',
      'group_create': 'group.create',
      'group_list': 'group.list',
      'group_addMember': 'group.addMember',
      'ui_navigate': 'ui.navigate',
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
          uri: 'docmost://spaces',
          name: 'Spaces',
          description: 'All spaces in the workspace',
          mimeType: 'application/json',
        },
        {
          uri: 'docmost://pages',
          name: 'Pages',
          description: 'All pages across all spaces',
          mimeType: 'application/json',
        },
        {
          uri: 'docmost://users',
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
      'docmost://spaces': async () => {
        const result = await this.mcpService.processRequest({
          jsonrpc: '2.0',
          method: 'space.list',
          params: { limit: 100 },
          id: Date.now(),
        }, user);
        return result.result;
      },
      'docmost://pages': async () => {
        const result = await this.mcpService.processRequest({
          jsonrpc: '2.0',
          method: 'page.list',
          params: { limit: 100 },
          id: Date.now(),
        }, user);
        return result.result;
      },
      'docmost://users': async () => {
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