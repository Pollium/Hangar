import Fastify, { type FastifyInstance, type FastifyBaseLogger } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import { DataSource } from 'typeorm';
import { registerCodespaceProxy } from '@/modules/codespaces/proxy/codespaceProxy';
import { registerPreviewProxy } from '@/modules/previews/proxy/previewProxy';
import { registerGithubOAuth } from '@/modules/auth/oauth/githubOAuth';
import { config } from '@/shared/config';
import { createDataSource } from '@/core/models/data-source';
import ModuleDiscovery, { type MountedController } from '@/core/modules/discovery';
import { logger, type LogLevel } from '@/core/utils/Logger';
import { registerEventGroup } from '@/shared/events/registerEventGroup';
import RuntimeError from '@/shared/errors/RuntimeError';
import ValidationError from '@/shared/errors/ValidationError';
import { ApiError } from '@hangar/contracts/shared/http';
import type BaseQueue from '@/shared/queues/BaseQueue';
import type BaseGateway from '@/shared/gateways/BaseGateway';

export interface BuildOptions{
    queues?: boolean;
}

export default class Application{
    #app!: FastifyInstance;
    #dataSource?: DataSource;
    #queues: BaseQueue<unknown>[] = [];

    get dataSource(): DataSource | undefined{
        return this.#dataSource;
    }

    async build({ queues: startQueues = true }: BuildOptions = {}): Promise<FastifyInstance>{
        logger.configure({ level: config.log.level as LogLevel, pretty: config.log.pretty });
        this.#app = Fastify({
            loggerInstance: logger.raw as FastifyBaseLogger,
            disableRequestLogging: true
        });

        await this.#app.register(cors, {
            // CORS_ORIGIN may list several origins (comma-separated) so the web dev server can
            // land on any of a few ports without breaking cross-origin requests.
            origin: config.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean),
            // @fastify/cors defaults to GET,HEAD,POST — which silently blocks the PATCH/PUT/DELETE
            // preflights the API relies on (profile edits, deletes). Enumerate every verb we use.
            methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            credentials: true
        });
        await this.#app.register(multipart, {
            limits: { fileSize: config.storage.maxUploadBytes }
        });
        await this.#app.register(websocket);
        // Per-project code-server proxy (/codespace/<id>/*). Registered as an app-level plugin
        // rather than a controller because it is a prefix catch-all with its own WS upgrade.
        await registerCodespaceProxy(this.#app);
        // Public per-slug proxy (/__preview/<slug>/*) for user-published container ports; Caddy
        // rewrites `<slug>.preview.<domain>` to this prefix. Also a prefix catch-all with WS.
        registerPreviewProxy(this.#app);

        // Redirect + JSON routes for the GitHub OAuth "Connect" flow (raw, like the proxies —
        // the callback is a browser redirect, not a typed controller response).
        registerGithubOAuth(this.#app);

        const { controllers, entities, events, queues, gateways } = await new ModuleDiscovery().discover();

        this.#dataSource = createDataSource(entities);
        await this.#dataSource.initialize();

        this.#registerErrorHandler();
        this.#registerRequestLogging();
        await this.#mountControllers(controllers);
        this.#mountGateways(gateways);
        events.forEach(registerEventGroup);
        if(startQueues) this.#startQueues(queues);

        return this.#app;
    }

    async start(): Promise<void>{
        await this.build();
        await this.#app.listen({ port: config.port, host: '0.0.0.0' });
    }

    async stop(): Promise<void>{
        await this.#app.close();
        await Promise.all(this.#queues.map((queue) => queue.close()));
        await this.#dataSource?.destroy();
    }

    #registerErrorHandler(): void{
        this.#app.setErrorHandler((err, req, reply) => {
            const fastifyStatus = (err as { statusCode?: unknown }).statusCode;
            const status = err instanceof RuntimeError
                ? err.statusCode
                : typeof fastifyStatus === 'number' && fastifyStatus >= 400 && fastifyStatus <= 599
                    ? fastifyStatus
                    : 500;
            const message = err instanceof Error ? err.message : 'Internal Server Error';

            if(status >= 500){
                logger.error(`${req.method} ${req.url}`, err, { scope: 'http', statusCode: status });
            }

            const payload: ApiError = { error: message };
            if(err instanceof ValidationError) payload.errors = err.errors;

            reply.status(status).send(payload);
        });
    }

    #registerRequestLogging(): void{
        this.#app.addHook('onResponse', (req, reply, done) => {
            logger.debug(`${req.method} ${req.url}`, {
                scope: 'http',
                statusCode: reply.statusCode,
                ms: Math.round(reply.elapsedTime)
            });
            done();
        });
    }

    async #mountControllers(controllers: MountedController[]): Promise<void>{
        for(const { prefix, Controller } of controllers){
            await new Controller().register(this.#app, prefix);
        }
    }

    #mountGateways(gateways: Array<new () => BaseGateway>): void{
        for(const Gateway of gateways){
            new Gateway().register(this.#app);
        }
    }

    #startQueues(queues: Array<new () => BaseQueue<unknown>>): void{
        for(const Queue of queues){
            const queue = new Queue();
            queue.startWorker();
            this.#queues.push(queue);
        }
    }
}
