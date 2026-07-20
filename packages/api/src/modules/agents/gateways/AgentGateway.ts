import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import BaseGateway from '@/shared/gateways/BaseGateway';
import { Channel, getChannel } from '@/shared/gateways/Channel';
import { getClassMiddleware, Middleware } from '@/shared/middlewares/Middleware';
import { GatewayError } from '@/shared/errors/GatewayError';
import { logger } from '@/core/utils/Logger';
import { SocketAgentRoute } from '../middlewares/SocketAgentRoute';
import { agentRegistry } from '../transport/AgentRegistry';
import AgentConnection from '../transport/AgentConnection';
import Agent from '../models/Agent';
import type { GatewaySocket } from '@/shared/contracts/gateway';

// Ping connected agents on this cadence and drop any that miss a pong, so a half-open socket
// (agent host slept, network died, no clean close) is reaped instead of lingering as a zombie
// registration that swallows RPCs and reports the agent falsely online.
const HEARTBEAT_MS = 30000;

/**
 * The tunnel endpoint an agent dials. Unlike the JSON `{type}` gateways, this speaks the raw agent
 * protocol (`{t}` frames), so it bypasses BaseGateway's message dispatch and wires the socket
 * straight into an AgentConnection registered under the authenticated owner.
 */
@Channel('/agents/gateway')
@Middleware(SocketAgentRoute)
export default class AgentGateway extends BaseGateway{
    override register(app: FastifyInstance): void{
        const path = getChannel(this.constructor);
        if(!path) throw GatewayError.MissingChannel();
        const guards = getClassMiddleware(this.constructor);

        app.get(path, {
            websocket: true,
            preValidation: guards.map((mw) => async (req: FastifyRequest, reply: FastifyReply) => { await mw(req, reply); })
        }, (socket, req) => this.#onConnection(socket, req));
    }

    #onConnection(socket: GatewaySocket, req: FastifyRequest): void{
        const ctx = req.agentContext;
        if(!ctx){
            socket.close();
            return;
        }

        const connection = new AgentConnection(socket);
        agentRegistry.register(ctx.ownerId, ctx.agentId, connection);
        void Agent.update(ctx.agentId, { lastSeenAt: new Date() });
        logger.debug('agent connected', { scope: 'agent.tunnel', agentId: ctx.agentId, ownerId: ctx.ownerId });

        // Liveness: a missed pong between ticks means the link is gone; terminate to fire 'close',
        // which unregisters the connection below. The agent independently pings us too.
        let alive = true;
        socket.on('pong', () => { alive = true; });
        const heartbeat = setInterval(() => {
            if(!alive){ socket.terminate(); return; }
            alive = false;
            try{ socket.ping(); }catch{ /* socket already closing; the close handler cleans up */ }
        }, HEARTBEAT_MS);

        socket.on('message', (raw: Buffer) => connection.ingest(raw.toString()));
        socket.on('close', () => {
            clearInterval(heartbeat);
            agentRegistry.unregister(ctx.ownerId, ctx.agentId, connection);
            connection.dispose();
            void Agent.update(ctx.agentId, { lastSeenAt: new Date() });
            logger.debug('agent disconnected', { scope: 'agent.tunnel', agentId: ctx.agentId });
        });
    }
}
