// Setup environment for E2E tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/raven-docs_test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.APP_URL = 'http://localhost:3000';
process.env.REDIS_URL = 'redis://localhost:6379';