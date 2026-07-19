// The empty export makes this a module so `declare module` augments fastify rather than
// replacing it (an ambient script redefinition would shadow fastify's real types).
export {};

declare module 'fastify'{
    interface FastifyRequest{
        /** Set by SocketAgentRoute after a compute agent authenticates its tunnel handshake. */
        agentContext?: { agentId: number; ownerId: number };
    }
}
