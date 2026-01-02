import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyMultipart from '@fastify/multipart';
import fastifyCookie from '@fastify/cookie';

describe('MCP System (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  const testAppSecret = 'test-secret-123';

  beforeAll(async () => {
    process.env.APP_SECRET = testAppSecret;
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/raven-docs_test';
    
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({
        ignoreTrailingSlash: true,
        ignoreDuplicateSlashes: true,
      }),
    );

    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        stopAtFirstError: true,
        transform: true,
      }),
    );

    const fastifyInstance = app.getHttpAdapter().getInstance();
    await app.register(fastifyMultipart);
    await app.register(fastifyCookie);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/mcp (POST)', () => {
    it('should be accessible without workspace context', () => {
      return request(app.getHttpServer())
        .post('/api/mcp')
        .send({
          jsonrpc: '2.0',
          method: 'system.ping',
          params: {},
          id: 'test-1',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            jsonrpc: '2.0',
            id: 'test-1',
          });
          // Should have either result or error
          expect(res.body.result || res.body.error).toBeDefined();
        });
    });

    it('should handle invalid JSON-RPC request', () => {
      return request(app.getHttpServer())
        .post('/api/mcp')
        .send({
          method: 'test',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            jsonrpc: '2.0',
            error: {
              code: -32600,
              message: 'Invalid JSON-RPC version',
            },
          });
        });
    });

    it('should handle method not found', () => {
      return request(app.getHttpServer())
        .post('/api/mcp')
        .send({
          jsonrpc: '2.0',
          method: 'invalid.method',
          params: {},
          id: 'test-2',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            jsonrpc: '2.0',
            error: {
              code: -32601,
            },
            id: 'test-2',
          });
        });
    });
  });

  describe('/api/mcp/batch (POST)', () => {
    it('should process batch requests', () => {
      return request(app.getHttpServer())
        .post('/api/mcp/batch')
        .send([
          {
            jsonrpc: '2.0',
            method: 'system.ping',
            params: {},
            id: 'batch-1',
          },
          {
            jsonrpc: '2.0',
            method: 'invalid.method',
            params: {},
            id: 'batch-2',
          },
        ])
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).toHaveLength(2);
          expect(res.body[0].id).toBe('batch-1');
          expect(res.body[1].id).toBe('batch-2');
          expect(res.body[1].error).toBeDefined();
        });
    });

    it('should reject invalid batch request', () => {
      return request(app.getHttpServer())
        .post('/api/mcp/batch')
        .send('not-an-array')
        .expect(400);
    });
  });

  describe('/api/mcp/tools (GET)', () => {
    it('should return tool definitions', () => {
      return request(app.getHttpServer())
        .get('/api/mcp/tools')
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            schema_version: '1.0',
            name_for_model: 'Raven Docs MCP',
            name_for_human: 'Raven Docs Machine Control Protocol',
            tools: expect.any(Array),
          });
          expect(res.body.tools.length).toBeGreaterThan(0);
          expect(res.body.tools[0]).toMatchObject({
            type: 'function',
            function: {
              name: expect.any(String),
              description: expect.any(String),
              parameters: expect.any(Object),
            },
          });
        });
    });
  });

  describe('/api/mcp/openapi.json (GET)', () => {
    it('should return OpenAPI specification', () => {
      return request(app.getHttpServer())
        .get('/api/mcp/openapi.json')
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            openapi: '3.0.0',
            info: {
              title: 'Raven Docs Machine Control Protocol API',
              version: '1.0.0',
            },
            paths: expect.any(Object),
            components: expect.any(Object),
          });
        });
    });
  });

  describe('/api/api-keys/register (POST)', () => {
    it('should be accessible without workspace context', () => {
      return request(app.getHttpServer())
        .post('/api/api-keys/register')
        .set('x-registration-token', testAppSecret)
        .send({
          name: 'Test API Key',
          userId: 'test-user-id',
          workspaceId: 'test-workspace-id',
        })
        .expect((res) => {
          // Should either succeed or fail with a proper error (not 404)
          expect(res.status).not.toBe(404);
          if (res.status === 400) {
            // Expected if user/workspace doesn't exist
            expect(res.body.message).toContain('User or workspace not found');
          } else if (res.status === 401) {
            // Expected if token validation fails
            expect(res.body.message).toContain('Invalid registration token');
          }
        });
    });

    it('should reject request without registration token', () => {
      return request(app.getHttpServer())
        .post('/api/api-keys/register')
        .send({
          name: 'Test API Key',
          userId: 'test-user-id',
          workspaceId: 'test-workspace-id',
        })
        .expect(401);
    });

    it('should reject request with invalid registration token', () => {
      return request(app.getHttpServer())
        .post('/api/api-keys/register')
        .set('x-registration-token', 'wrong-token')
        .send({
          name: 'Test API Key',
          userId: 'test-user-id',
          workspaceId: 'test-workspace-id',
        })
        .expect(401);
    });

    it('should validate request body', () => {
      return request(app.getHttpServer())
        .post('/api/api-keys/register')
        .set('x-registration-token', testAppSecret)
        .send({
          name: 'ab', // Too short
          userId: 'test-user-id',
          workspaceId: 'test-workspace-id',
        })
        .expect(400);
    });
  });

  describe('Middleware exclusion verification', () => {
    it('should not require workspaceId for /api/mcp endpoints', async () => {
      // Test various MCP endpoints without workspace context
      const endpoints = [
        { method: 'POST', path: '/api/mcp' },
        { method: 'POST', path: '/api/mcp/batch' },
        { method: 'GET', path: '/api/mcp/tools' },
        { method: 'GET', path: '/api/mcp/openapi.json' },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer())
          [endpoint.method.toLowerCase()](endpoint.path)
          .send(endpoint.method === 'POST' ? { jsonrpc: '2.0', method: 'test', id: 1 } : undefined);
        
        // Should not get 404 "Workspace not found" error
        expect(response.status).not.toBe(404);
        if (response.status === 404) {
          expect(response.body.message).not.toContain('Workspace not found');
        }
      }
    });

    it('should not require workspaceId for /api/api-keys/register', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/api-keys/register')
        .set('x-registration-token', 'any-token')
        .send({
          name: 'Test',
          userId: 'user-id',
          workspaceId: 'workspace-id',
        });

      // Should not get 404 "Workspace not found" error
      expect(response.status).not.toBe(404);
      if (response.status === 404) {
        expect(response.body.message).not.toContain('Workspace not found');
      }
    });
  });
});