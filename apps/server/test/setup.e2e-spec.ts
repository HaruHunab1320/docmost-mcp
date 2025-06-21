import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Setup Flow (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/auth/setup (POST) - should create admin user', () => {
    return request(app.getHttpServer())
      .post('/api/auth/setup')
      .send({
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'SecurePassword123!',
        workspaceName: 'Test Workspace',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('user');
        expect(res.body.data).toHaveProperty('workspace');
        expect(res.body.data.user.email).toBe('admin@test.com');
        expect(res.body.data.user.role).toBe('admin');
      });
  });

  it('/auth/setup (POST) - should fail if already setup', async () => {
    // First setup
    await request(app.getHttpServer())
      .post('/api/auth/setup')
      .send({
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'SecurePassword123!',
        workspaceName: 'Test Workspace',
      })
      .expect(201);

    // Second attempt should fail
    return request(app.getHttpServer())
      .post('/api/auth/setup')
      .send({
        name: 'Another Admin',
        email: 'admin2@test.com',
        password: 'SecurePassword123!',
        workspaceName: 'Another Workspace',
      })
      .expect(400);
  });
});