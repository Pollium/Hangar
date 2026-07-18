import { afterAll, beforeAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { DataSource } from 'typeorm';
import Application from '@/core/Application';
import JWTService from '@/modules/auth/services/JWTService';

export interface TestApp{
    app: FastifyInstance;
    dataSource: DataSource;
    resetDb: () => Promise<void>;
    close: () => Promise<void>;
}

export const createTestApp = async (): Promise<TestApp> => {
    const application = new Application();
    const app = await application.build({ queues: false });
    const dataSource = application.dataSource!;

    return {
        app,
        dataSource,
        resetDb: () => dataSource.synchronize(true),
        close: () => application.stop()
    };
};

export const useApp = (): TestApp => {
    const ctx = {} as TestApp;

    beforeAll(async () => {
        Object.assign(ctx, await createTestApp());
    });
    afterAll(() => ctx.close());
    beforeEach(() => ctx.resetDb());

    return ctx;
};

export const authHeader = (userId: number): Record<string, string> => ({
    authorization: `Bearer ${new JWTService().sign(userId)}`
});

export const flushEvents = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
