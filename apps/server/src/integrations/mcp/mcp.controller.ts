import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  BadRequestException,
  Get,
  Param,
} from '@nestjs/common';
import { MCPService } from './mcp.service';
import { MCPRequest, MCPResponse } from './interfaces/mcp.interface';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { User } from '@raven-docs/db/types/entity.types';
import { MCPPermissionGuard } from './guards/mcp-permission.guard';
import { MCPAuthGuard } from './guards/mcp-auth.guard';
import { MCPSchemaService } from './services/mcp-schema.service';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Machine Control Protocol (MCP) Controller
 *
 * This controller handles incoming HTTP requests for the MCP API.
 * It validates the requests and forwards them to the MCP service
 * for processing.
 *
 * TODO(raven-docs): Legacy JSON-RPC endpoint. Keep for internal MCP Standard use only.
 */
@UseGuards(MCPAuthGuard, MCPPermissionGuard)
@Controller('mcp')
export class MCPController {
  private readonly logger = new Logger(MCPController.name);

  constructor(
    private readonly mcpService: MCPService,
    private readonly mcpSchemaService: MCPSchemaService,
  ) {}

  /**
   * Process an MCP request
   *
   * This endpoint accepts JSON-RPC 2.0 requests and returns
   * appropriate JSON-RPC 2.0 responses.
   *
   * @param request The MCP request
   * @param user The authenticated user
   * @returns The MCP response
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @SkipTransform()
  async processRequest(
    @Body() request: MCPRequest,
    @AuthUser() user: User,
  ): Promise<MCPResponse> {
    this.logger.debug(
      `MCPController: Processing request: ${request.method}, id: ${request.id}`,
    );
    this.logger.debug(
      `MCPController: User context: id=${user?.id}, email=${user?.email}, workspace=${user?.workspaceId}`,
    );

    try {
      this.logger.debug(
        `MCPController: Validating request and passing to mcpService.processRequest`,
      );
      const response = await this.mcpService.processRequest(request, user);
      this.logger.debug(
        `MCPController: Request processed successfully: ${request.id}`,
      );
      return response;
    } catch (error: any) {
      this.logger.error(
        `MCPController: Error processing request ${request.id}: ${error.message || 'Unknown error'}`,
        error.stack || '',
      );

      // Create a proper JSON-RPC error response
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603, // Internal error
          message: error.message || 'Internal server error',
        },
        id: request.id,
      };
    }
  }

  /**
   * Process a batch of MCP requests
   *
   * This endpoint accepts an array of JSON-RPC 2.0 requests
   * and returns an array of JSON-RPC 2.0 responses.
   *
   * @param requests An array of MCP requests
   * @param user The authenticated user
   * @returns An array of MCP responses
   */
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @SkipTransform()
  async processBatchRequest(
    @Body() requests: MCPRequest[],
    @AuthUser() user: User,
  ): Promise<MCPResponse[]> {
    this.logger.debug(
      `Received batch MCP request with ${requests?.length || 0} items from user ${user.id}`,
    );

    if (!Array.isArray(requests) || requests.length === 0) {
      throw new BadRequestException('Invalid batch request');
    }

    // Process each request in the batch
    const responses = await Promise.all(
      requests.map((request) => this.mcpService.processRequest(request, user)),
    );

    return responses;
  }

  /**
   * Get tool definitions for AI assistants
   *
   * This endpoint exposes MCP methods as tools in a format compatible
   * with AI assistants like those from OpenAI, Anthropic, or Cursor.
   */
  @Get('tools')
  @Public()
  @SkipTransform()
  async getTools() {
    this.logger.debug('Getting tool definitions for AI assistants');

    // Get all method schemas
    const schemas = this.mcpSchemaService.getAllMethodSchemas();

    // Convert schemas to tool definitions
    const tools = schemas.map((schema) => {
      // Convert MCP parameters to tool parameters
      const parameters = {
        type: 'object',
        properties: {},
        required: [],
      };

      // Add parameters
      for (const [key, param] of Object.entries(schema.parameters)) {
        parameters.properties[key] = {
          type: param.type === 'object' ? 'object' : 'string',
          description: param.description,
        };

        if (param.required) {
          parameters.required.push(key);
        }
      }

      return {
        type: 'function',
        function: {
          name: schema.name,
          description: schema.description,
          parameters: parameters,
        },
      };
    });

    return {
      schema_version: '1.0',
      name_for_model: 'Raven Docs MCP',
      name_for_human: 'Raven Docs Machine Control Protocol',
      tools,
    };
  }

  /**
   * Get OpenAPI specification for the MCP API
   *
   * This endpoint generates an OpenAPI spec from MCP method schemas
   */
  @Get('openapi.json')
  @Public()
  @SkipTransform()
  async getOpenAPISpec() {
    this.logger.debug('Generating OpenAPI specification');

    // Get all method schemas
    const schemas = this.mcpSchemaService.getAllMethodSchemas();
    const paths = {};
    const components = {
      schemas: {},
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    };

    // Create paths for each method
    schemas.forEach((schema) => {
      const [resource, operation] = schema.name.split('.');
      const path = `/api/mcp/${resource}/${operation}`;

      paths[path] = {
        post: {
          summary: schema.description,
          tags: [schema.category],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: schema.parameters,
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Successful operation',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: schema.returns,
                  },
                },
              },
            },
            '400': {
              description: 'Bad request',
            },
            '401': {
              description: 'Unauthorized',
            },
          },
        },
      };
    });

    return {
      openapi: '3.0.0',
      info: {
        title: 'Raven Docs Machine Control Protocol API',
        description: 'API for AI agents to interact with Raven Docs',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Local development server',
        },
      ],
      paths,
      components,
    };
  }
}
