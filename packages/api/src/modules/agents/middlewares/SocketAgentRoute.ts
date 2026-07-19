import { MiddlewareFn } from '@/shared/middlewares/Middleware';
import { AgentError } from '../contracts/domain/errors';
import { parseToken, secretMatches } from '../services/AgentTokenService';
import Agent from '../models/Agent';

/** Authenticates an agent's tunnel handshake. The token rides as the sole WS subprotocol, like
 *  the browser sockets, and identifies which user's compute this connection belongs to. */
export const SocketAgentRoute: MiddlewareFn = async (req) => {
    const header = req.headers['sec-websocket-protocol'];
    const token = header?.split(',')[0]?.trim();
    if(!token) throw AgentError.Unauthorized();

    const parsed = parseToken(token);
    if(!parsed) throw AgentError.Unauthorized();

    const agent = await Agent.findOneBy({ id: parsed.agentId });
    if(!agent || !secretMatches(parsed.secret, agent.tokenHash)) throw AgentError.Unauthorized();

    req.agentContext = { agentId: agent.id, ownerId: agent.ownerId };
};
