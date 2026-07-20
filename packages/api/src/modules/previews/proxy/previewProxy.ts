import http from 'node:http';
import type { Duplex } from 'node:stream';
import WebSocket from 'ws';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '@/core/utils/Logger';
import { agentRegistry } from '@/modules/agents/transport/AgentRegistry';
import PreviewService, { type PreviewTarget } from '@/modules/previews/services/PreviewService';

const PATH_RE = /^\/__preview\/([^/?]+)/;

// Public, unauthenticated proxy: the slug is the only capability. Cap request rate per (slug, IP)
// with a token bucket to blunt scraping/abuse — 4/s sustained, bursts to 240.
const RATE_CAPACITY = 240;
const RATE_REFILL_PER_MS = 4 / 1000;

const stripPrefix = (url: string): string => url.replace(/^\/__preview\/[^/]+/, '') || '/';
const slugFromUrl = (url: string): string | null => {
    const match = PATH_RE.exec(url);
    return match ? match[1] : null;
};

/** Backs an http.request / ws upstream connection with a single tunnel stream (no pooling). */
class TunnelAgent extends http.Agent{
    #stream: Duplex;
    constructor(stream: Duplex){
        super({ maxSockets: 1, keepAlive: false });
        this.#stream = stream;
    }
    createConnection(): Duplex{
        return this.#stream;
    }
}

interface Bucket{ tokens: number; ts: number; }

/**
 * Public reverse proxy for user-published container ports. The app runs on the project owner's
 * agent, reachable only through the tunnel, so every HTTP request and WebSocket is relayed over a
 * raw TCP stream opened on that agent (`tcp.open`). Access is gated solely by the unguessable slug
 * in the subdomain (Caddy rewrites `<slug>.preview.<domain>` → `/__preview/<slug>/*`).
 */
export const registerPreviewProxy = (app: FastifyInstance): void => {
    const service = new PreviewService();
    const buckets = new Map<string, Bucket>();

    const allow = (slug: string, ip: string): boolean => {
        const key = `${slug}|${ip}`;
        const now = Date.now();
        const bucket = buckets.get(key) ?? { tokens: RATE_CAPACITY, ts: now };
        bucket.tokens = Math.min(RATE_CAPACITY, bucket.tokens + (now - bucket.ts) * RATE_REFILL_PER_MS);
        bucket.ts = now;
        if(bucket.tokens < 1){ buckets.set(key, bucket); return false; }
        bucket.tokens -= 1;
        buckets.set(key, bucket);
        return true;
    };

    const openTunnel = (target: PreviewTarget): Duplex | null => {
        const connection = agentRegistry.connectionFor(target.ownerId);
        if(!connection) return null;
        return connection.openStream('tcp.open', { id: target.containerId, port: target.port });
    };

    const httpHandler = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
        const slug = slugFromUrl(req.url);
        if(!slug){ reply.code(404).send(); return; }
        if(!allow(slug, req.ip)){ reply.code(429).send(); return; }

        const target = await service.resolve(slug);
        if(!target){ reply.code(404).send({ error: 'Preview::NotFound' }); return; }
        const tunnel = openTunnel(target);
        if(!tunnel){ reply.code(502).send({ error: 'Preview::AgentOffline' }); return; }

        reply.hijack();
        const headers = { ...req.headers, host: 'preview' };
        const upstream = http.request(
            { createConnection: () => tunnel, method: req.method, path: stripPrefix(req.url), headers },
            (res) => {
                reply.raw.writeHead(res.statusCode ?? 502, res.headers);
                res.pipe(reply.raw);
            }
        );
        upstream.on('error', () => { if(!reply.raw.headersSent) reply.raw.writeHead(502); reply.raw.end(); });
        req.raw.pipe(upstream);
    };

    const wsHandler = async (browser: WebSocket, req: FastifyRequest): Promise<void> => {
        const slug = slugFromUrl(req.url);
        if(!slug || !allow(slug, req.ip)){ browser.close(); return; }
        const target = await service.resolve(slug);
        if(!target){ browser.close(); return; }
        const tunnel = openTunnel(target);
        if(!tunnel){ browser.close(); return; }

        const upstream = new WebSocket(`ws://preview${stripPrefix(req.url)}`, { agent: new TunnelAgent(tunnel) });
        const pending: Array<{ data: WebSocket.RawData; binary: boolean }> = [];

        browser.on('message', (data: WebSocket.RawData, binary: boolean) => {
            if(upstream.readyState === WebSocket.OPEN) upstream.send(data, { binary });
            else pending.push({ data, binary });
        });
        upstream.on('open', () => {
            for(const frame of pending) upstream.send(frame.data, { binary: frame.binary });
            pending.length = 0;
        });
        upstream.on('message', (data: WebSocket.RawData, binary: boolean) => {
            if(browser.readyState === WebSocket.OPEN) browser.send(data, { binary });
        });
        browser.on('close', () => upstream.close());
        upstream.on('close', () => browser.close());
        browser.on('error', () => upstream.close());
        upstream.on('error', () => browser.close());
    };

    app.route({
        method: 'GET',
        url: '/__preview/:slug/*',
        handler: httpHandler,
        wsHandler: wsHandler as never
    });
    app.route({
        // HEAD is registered implicitly alongside the GET route above; re-declaring it collides.
        method: ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        url: '/__preview/:slug/*',
        handler: httpHandler
    });

    logger.debug('preview proxy mounted at /__preview', { scope: 'preview.proxy' });
};
