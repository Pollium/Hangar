import { vi } from 'vitest';

Object.assign(process.env, {
    JWT_SECRET: 'test-jwt-secret',
    ENCRYPTION_KEY: '0'.repeat(64),
    PORT: '3000',
    DATABASE_PATH: ':memory:',
    CORS_ORIGIN: 'http://localhost:5173',
    LOG_LEVEL: 'silent',
    LOG_PRETTY: 'false',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379'
});

const { default: BaseQueue } = await import('@/shared/queues/BaseQueue');

vi.spyOn(BaseQueue.prototype, 'add').mockResolvedValue();
