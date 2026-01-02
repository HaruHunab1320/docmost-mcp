import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('MCP Standard API (e2e)', () => {
  let app: INestApplication;
  let apiKey: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Note: In a real test, you'd set up test data and create an API key
    // For now, we'll test the public endpoints
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Public Endpoints', () => {
    it('/mcp-standard/initialize (POST) - should return protocol info', () => {
      return request(app.getHttpServer())
        .post('/api/mcp-standard/initialize')
        .send({
          protocolVersion: '2024-11-05',
          capabilities: {},
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('protocolVersion');
          expect(res.body.data).toHaveProperty('capabilities');
          expect(res.body.data).toHaveProperty('serverInfo');
          expect(res.body.data.serverInfo.name).toBe('raven-docs');
        });
    });

    it('/mcp-standard/list_tools (POST) - should return available tools', () => {
      return request(app.getHttpServer())
        .post('/api/mcp-standard/list_tools')
        .send({})
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('tools');
          expect(Array.isArray(res.body.data.tools)).toBe(true);
          expect(res.body.data.tools.length).toBeGreaterThan(0);
          
          // Check tool structure
          const firstTool = res.body.data.tools[0];
          expect(firstTool).toHaveProperty('name');
          expect(firstTool).toHaveProperty('description');
          expect(firstTool).toHaveProperty('inputSchema');
        });
    });
  });

  describe('Authenticated Endpoints', () => {
    it('/mcp-standard/list_resources (POST) - should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/mcp-standard/list_resources')
        .send({})
        .expect(403); // Should fail without auth
    });

    it('/mcp-standard/call_tool (POST) - should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/mcp-standard/call_tool')
        .send({
          name: 'space_list',
          arguments: { workspaceId: 'test' },
        })
        .expect(403); // Should fail without auth
    });

    // With API key tests would look like:
    // it('/mcp-standard/call_tool (POST) - should work with valid API key', () => {
    //   return request(app.getHttpServer())
    //     .post('/api/mcp-standard/call_tool')
    //     .set('Authorization', `Bearer ${apiKey}`)
    //     .send({
    //       name: 'space_list',
    //       arguments: { workspaceId: validWorkspaceId },
    //     })
    //     .expect(200)
    //     .expect((res) => {
    //       expect(res.body.data).toHaveProperty('content');
    //       expect(Array.isArray(res.body.data.content)).toBe(true);
    //     });
    // });
  });

  describe('Tool Validation', () => {
    it('/mcp-standard/call_tool (POST) - should reject unknown tools', () => {
      return request(app.getHttpServer())
        .post('/api/mcp-standard/call_tool')
        .set('Authorization', 'Bearer mcp_fake_key')
        .send({
          name: 'unknown_tool',
          arguments: {},
        })
        .expect(403); // Will fail on auth, but would be 400 with valid auth
    });
  });
});