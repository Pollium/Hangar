import http from 'node:http';
import type { Duplex } from 'node:stream';
import WebSocket from 'ws';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '@/core/utils/Logger';
import { agentRegistry } from '@/modules/agents/transport/AgentRegistry';
import JWTService, { type CodespacePayload } from '@/modules/auth/services/JWTService';
import { codeServerPort } from '@/modules/codespaces/services/CodespaceService';

const PATH_RE = /^\/codespace\/(\d+)(?:[/?]|$)/;
const COOKIE_PREFIX = 'cc_codespace_';

const projectFromUrl = (url: string): number | null => {
    const match = PATH_RE.exec(url);
    return match ? Number(match[1]) : null;
};

// code-server serves at the origin root with only relative asset URLs, so strip the whole
// `/codespace/<id>` prefix; its relative assets resolve back under the prefix in the browser.
const stripPrefix = (url: string): string => url.replace(/^\/codespace\/\d+/, '') || '/';
const cookieName = (projectId: number): string => `${COOKIE_PREFIX}${projectId}`;

const readCookie = (header: string | undefined, name: string): string | undefined => {
    if(!header) return undefined;
    for(const part of header.split(';')){
        const index = part.indexOf('=');
        if(index === -1) continue;
        if(part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
    }
    return undefined;
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

/**
 * Same-origin (via Caddy) codespace proxy. code-server lives in a container on the project owner's
 * agent, unreachable from the control plane except through the tunnel, so every HTTP request and
 * WebSocket is relayed over a raw TCP stream opened on that agent. Auth is a per-project httpOnly
 * cookie carrying the owner + container id (minted alongside code-server startup).
 */
export const registerCodespaceProxy = (app: FastifyInstance): void => {
    const jwt = new JWTService();

    const claimsFor = (req: FastifyRequest, projectId: number): CodespacePayload | null => {
        const token = readCookie(req.headers.cookie, cookieName(projectId));
        if(!token) return null;
        try{
            const claims = jwt.verifyCodespace(token);
            return claims.projectId === projectId ? claims : null;
        }catch{
            return null;
        }
    };

    const openTunnel = (claims: CodespacePayload): Duplex | null => {
        const connection = agentRegistry.connectionFor(claims.ownerId);
        if(!connection) return null;
        return connection.openStream('tcp.open', { id: claims.containerId, port: codeServerPort(claims.projectId) });
    };

    const authenticate = (req: FastifyRequest, reply: FastifyReply, done: () => void): void => {
        const projectId = projectFromUrl(req.url);
        if(projectId === null){ reply.code(404).send(); return; }

        const url = new URL(req.url, 'http://local');
        const ticket = url.searchParams.get('cc');
        if(ticket){
            let claims: CodespacePayload;
            try{
                claims = jwt.verifyCodespace(ticket);
            }catch{
                reply.code(403).send();
                return;
            }
            if(claims.projectId !== projectId){ reply.code(403).send(); return; }
            url.searchParams.delete('cc');
            reply.header('set-cookie', `${cookieName(projectId)}=${ticket}; HttpOnly; SameSite=Lax; Path=/codespace/${projectId}/`);
            reply.redirect(`${url.pathname}${url.search}`);
            return;
        }

        if(!claimsFor(req, projectId)){ reply.code(401).send(); return; }
        done();
    };

    const httpHandler = (req: FastifyRequest, reply: FastifyReply): void => {
        const projectId = projectFromUrl(req.url) as number;
        const claims = claimsFor(req, projectId);
        if(!claims){ reply.code(401).send(); return; }

        const tunnel = openTunnel(claims);
        if(!tunnel){ reply.code(502).send({ error: 'Codespace::AgentOffline' }); return; }

        reply.hijack();
        const headers = { ...req.headers, host: 'codespace' };
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

    const wsHandler = (browser: WebSocket, req: FastifyRequest): void => {
        const projectId = projectFromUrl(req.url) as number;
        const claims = claimsFor(req, projectId);
        if(!claims){ browser.close(); return; }
        const tunnel = openTunnel(claims);
        if(!tunnel){ browser.close(); return; }

        const upstream = new WebSocket(`ws://codespace${stripPrefix(req.url)}`, { agent: new TunnelAgent(tunnel) });
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
        url: '/codespace/:projectId/*',
        preHandler: authenticate,
        handler: httpHandler,
        wsHandler: wsHandler as never
    });
    app.route({
        method: ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        url: '/codespace/:projectId/*',
        preHandler: authenticate,
        handler: httpHandler
    });

    logger.debug('codespace proxy mounted at /codespace', { scope: 'codespace.proxy' });
};
