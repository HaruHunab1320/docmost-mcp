import { Test, TestingModule } from '@nestjs/testing';
import { MCPController } from './mcp.controller';
import { MCPService } from './mcp.service';
import { MCPSchemaService } from './services/mcp-schema.service';
import { MCPRequest, MCPResponse } from './interfaces/mcp.interface';
import { User } from '@raven-docs/db/types/entity.types';
import { BadRequestException } from '@nestjs/common';

describe('MCPController', () => {
  let controller: MCPController;
  let mcpService: MCPService;
  let mcpSchemaService: MCPSchemaService;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    workspaceId: 'workspace-123',
    name: 'Test User',
    role: 'member',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockMCPService = {
    processRequest: jest.fn(),
  };

  const mockMCPSchemaService = {
    getAllMethodSchemas: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MCPController],
      providers: [
        {
          provide: MCPService,
          useValue: mockMCPService,
        },
        {
          provide: MCPSchemaService,
          useValue: mockMCPSchemaService,
        },
      ],
    }).compile();

    controller = module.get<MCPController>(MCPController);
    mcpService = module.get<MCPService>(MCPService);
    mcpSchemaService = module.get<MCPSchemaService>(MCPSchemaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('processRequest', () => {
    it('should process a valid MCP request', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'page.list',
        params: { spaceId: 'space-123' },
        id: 'req-123',
      };

      const expectedResponse: MCPResponse = {
        jsonrpc: '2.0',
        result: { pages: [] },
        id: 'req-123',
      };

      mockMCPService.processRequest.mockResolvedValue(expectedResponse);

      const result = await controller.processRequest(request, mockUser);

      expect(result).toEqual(expectedResponse);
      expect(mcpService.processRequest).toHaveBeenCalledWith(request, mockUser);
    });

    it('should return error response when service throws', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'page.create',
        params: { title: 'Test' },
        id: 'req-456',
      };

      const error = new Error('Permission denied');
      mockMCPService.processRequest.mockRejectedValue(error);

      const result = await controller.processRequest(request, mockUser);

      expect(result).toEqual({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Permission denied',
        },
        id: 'req-456',
      });
    });

    it('should handle requests without id', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'system.ping',
        params: {},
      };

      const expectedResponse: MCPResponse = {
        jsonrpc: '2.0',
        result: { pong: true },
      };

      mockMCPService.processRequest.mockResolvedValue(expectedResponse);

      const result = await controller.processRequest(request, mockUser);

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('processBatchRequest', () => {
    it('should process multiple requests in a batch', async () => {
      const requests: MCPRequest[] = [
        {
          jsonrpc: '2.0',
          method: 'page.list',
          params: {},
          id: 'req-1',
        },
        {
          jsonrpc: '2.0',
          method: 'space.list',
          params: {},
          id: 'req-2',
        },
      ];

      const responses: MCPResponse[] = [
        {
          jsonrpc: '2.0',
          result: { pages: [] },
          id: 'req-1',
        },
        {
          jsonrpc: '2.0',
          result: { spaces: [] },
          id: 'req-2',
        },
      ];

      mockMCPService.processRequest
        .mockResolvedValueOnce(responses[0])
        .mockResolvedValueOnce(responses[1]);

      const result = await controller.processBatchRequest(requests, mockUser);

      expect(result).toEqual(responses);
      expect(mcpService.processRequest).toHaveBeenCalledTimes(2);
      expect(mcpService.processRequest).toHaveBeenNthCalledWith(1, requests[0], mockUser);
      expect(mcpService.processRequest).toHaveBeenNthCalledWith(2, requests[1], mockUser);
    });

    it('should throw BadRequestException for invalid batch request', async () => {
      await expect(
        controller.processBatchRequest(null as any, mockUser),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.processBatchRequest([], mockUser),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.processBatchRequest('not-an-array' as any, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle mixed success and error responses in batch', async () => {
      const requests: MCPRequest[] = [
        {
          jsonrpc: '2.0',
          method: 'page.create',
          params: { title: 'Test' },
          id: 'req-1',
        },
        {
          jsonrpc: '2.0',
          method: 'page.delete',
          params: { pageId: 'invalid' },
          id: 'req-2',
        },
      ];

      mockMCPService.processRequest
        .mockResolvedValueOnce({
          jsonrpc: '2.0',
          result: { page: { id: 'page-123' } },
          id: 'req-1',
        })
        .mockResolvedValueOnce({
          jsonrpc: '2.0',
          error: { code: -32602, message: 'Page not found' },
          id: 'req-2',
        });

      const result = await controller.processBatchRequest(requests, mockUser);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('result');
      expect(result[1]).toHaveProperty('error');
    });
  });

  describe('getTools', () => {
    it('should return tool definitions for AI assistants', async () => {
      const mockSchemas = [
        {
          name: 'page.create',
          description: 'Create a new page',
          category: 'Pages',
          parameters: {
            title: {
              type: 'string',
              description: 'Page title',
              required: true,
            },
            content: {
              type: 'string',
              description: 'Page content',
              required: false,
            },
          },
          returns: {},
        },
        {
          name: 'space.list',
          description: 'List all spaces',
          category: 'Spaces',
          parameters: {},
          returns: {},
        },
      ];

      mockMCPSchemaService.getAllMethodSchemas.mockReturnValue(mockSchemas);

      const result = await controller.getTools();

      expect(result).toEqual({
        schema_version: '1.0',
        name_for_model: 'Raven Docs MCP',
        name_for_human: 'Raven Docs Machine Control Protocol',
        tools: [
          {
            type: 'function',
            function: {
              name: 'page.create',
              description: 'Create a new page',
              parameters: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    description: 'Page title',
                  },
                  content: {
                    type: 'string',
                    description: 'Page content',
                  },
                },
                required: ['title'],
              },
            },
          },
          {
            type: 'function',
            function: {
              name: 'space.list',
              description: 'List all spaces',
              parameters: {
                type: 'object',
                properties: {},
                required: [],
              },
            },
          },
        ],
      });
    });
  });

  describe('getOpenAPISpec', () => {
    it('should generate OpenAPI specification', async () => {
      const mockSchemas = [
        {
          name: 'page.create',
          description: 'Create a new page',
          category: 'Pages',
          parameters: {
            title: { type: 'string', required: true },
          },
          returns: {
            page: { type: 'object' },
          },
        },
      ];

      mockMCPSchemaService.getAllMethodSchemas.mockReturnValue(mockSchemas);

      const result = await controller.getOpenAPISpec();

      expect(result).toMatchObject({
        openapi: '3.0.0',
        info: {
          title: 'Raven Docs Machine Control Protocol API',
          version: '1.0.0',
        },
        paths: {
          '/api/mcp/page/create': {
            post: {
              summary: 'Create a new page',
              tags: ['Pages'],
              security: [{ bearerAuth: [] }],
            },
          },
        },
      });
    });
  });
});