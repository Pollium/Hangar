import replyFrom from '@fastify/reply-from';
import WebSocket from 'ws';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';
import JWTService from '@/modules/auth/services/JWTService';
import { codeServerPort } from '@/modules/codespaces/services/CodespaceService';

const PATH_RE = /^\/codespace\/(\d+)(?:[/?]|$)/;
const COOKIE_PREFIX = 'cc_codespace_';

const projectFromUrl = (url: string): number | null => {
    const match = PATH_RE.exec(url);
    return match ? Number(match[1]) : null;
};

// code-server serves at the origin root and emits only relative asset URLs, so strip the whole
// `/codespace/<id>` prefix; its relative assets then resolve back under the prefix in the browser.
const stripPrefix = (url: string): string => url.replace(/^\/codespace\/\d+/, '') || '/';

const cookieName = (projectId: number): string => `${COOKIE_PREFIX}${projectId}`;
const httpUpstream = (projectId: number): string => `http://cc-${config.docker.namespace}-project-${projectId}:${codeServerPort(projectId)}`;
const wsUpstream = (projectId: number, rest: string): string => `ws://cc-${config.docker.namespace}-project-${projectId}:${codeServerPort(projectId)}${rest}`;

const readCookie = (header: string | undefined, name: string): string | undefined => {
    if(!header) return undefined;
    for(const part of header.split(';')){
        const index = part.indexOf('=');
        if(index === -1) continue;
        if(part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
    }
    return undefined;
};

const cookieAuthorizes = (jwt: JWTService, req: FastifyRequest, projectId: number): boolean => {
    const token = readCookie(req.headers.cookie, cookieName(projectId));
    if(!token) return false;
    try{
        return jwt.verifyCodespace(token).projectId === projectId;
    }catch{
        return false;
    }
};

/**
 * Same-origin (via Caddy) reverse proxy from `/codespace/<projectId>/*` to that project's
 * in-container code-server — HTTP through @fastify/reply-from and WebSockets relayed through the
 * app's existing @fastify/websocket upgrade handler (adding a second one, as @fastify/http-proxy
 * does, collides with the gateway sockets). Auth is a short-lived `?cc=` ticket, swapped once for
 * a per-project httpOnly cookie that then gates every asset, XHR, and socket.
 */
export const registerCodespaceProxy = async (app: FastifyInstance): Promise<void> => {
    const jwt = new JWTService();

    // The upstream host is chosen per request inside each reply.from() call (getUpstream there),
    // so no base/upstream is set at registration.
    await app.register(replyFrom);

    // Runs before both the HTTP handler and the WS upgrade (@fastify/websocket honours preHandler).
    const authenticate = (req: FastifyRequest, reply: FastifyReply, done: () => void): void => {
        const projectId = projectFromUrl(req.url);
        if(projectId === null){
            reply.code(404).send();
            return;
        }

        const url = new URL(req.url, 'http://local');
        const ticket = url.searchParams.get('cc');
        if(ticket){
            try{
                if(jwt.verifyCodespace(ticket).projectId !== projectId) throw new Error('project mismatch');
            }catch{
                reply.code(403).send();
                return;
            }
            url.searchParams.delete('cc');
            reply.header('set-cookie', `${cookieName(projectId)}=${ticket}; HttpOnly; SameSite=Lax; Path=/codespace/${projectId}/`);
            reply.redirect(`${url.pathname}${url.search}`);
            return;
        }

        if(!cookieAuthorizes(jwt, req, projectId)){
            reply.code(401).send();
            return;
        }
        done();
    };

    const httpHandler = (req: FastifyRequest, reply: FastifyReply): void => {
        const projectId = projectFromUrl(req.url) as number;
        // Host comes from getUpstream; forward only the prefix-stripped path here.
        reply.from(stripPrefix(req.url), {
            getUpstream: () => httpUpstream(projectId),
            rewriteHeaders(headers){
                // Re-anchor any absolute redirect back under this codespace's base path.
                const location = headers.location;
                if(typeof location === 'string' && location.startsWith('/') && !location.startsWith('//')){
                    headers.location = `/codespace/${projectId}${location}`;
                }
                return headers;
            }
        });
    };

    // Relays the browser socket to code-server's socket inside the container, buffering client
    // frames until the upstream connection opens. Handlers are attached synchronously so no early
    // frame is dropped (see @fastify/websocket guidance).
    const wsHandler = (socket: WebSocket, req: FastifyRequest): void => {
        const projectId = projectFromUrl(req.url);
        if(projectId === null){
            socket.close();
            return;
        }

        const upstream = new WebSocket(wsUpstream(projectId, stripPrefix(req.url)));
        const pending: Array<{ data: WebSocket.RawData; binary: boolean }> = [];

        socket.on('message', (data: WebSocket.RawData, binary: boolean) => {
            if(upstream.readyState === WebSocket.OPEN) upstream.send(data, { binary });
            else pending.push({ data, binary });
        });
        socket.on('close', () => upstream.close());
        socket.on('error', () => upstream.close());

        upstream.on('open', () => {
            for(const frame of pending) upstream.send(frame.data, { binary: frame.binary });
            pending.length = 0;
        });
        upstream.on('message', (data: WebSocket.RawData, binary: boolean) => {
            if(socket.readyState === WebSocket.OPEN) socket.send(data, { binary });
        });
        upstream.on('close', () => socket.close());
        upstream.on('error', () => socket.close());
    };

    // No `websocket: true` here: providing both handler + wsHandler makes this route serve HTTP
    // normally and only upgrade to the WS relay when a socket upgrade arrives.
    app.route({
        method: 'GET',
        url: '/codespace/:projectId/*',
        preHandler: authenticate,
        handler: httpHandler,
        wsHandler
    });
    // HEAD is auto-registered alongside the GET route above, so it is omitted here.
    app.route({
        method: ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        url: '/codespace/:projectId/*',
        preHandler: authenticate,
        handler: httpHandler
    });

    logger.debug('codespace proxy mounted at /codespace', { scope: 'codespace.proxy' });
};
