import AgentConnection from './AgentConnection';
import RemoteDockerService from './RemoteDockerService';
import { AgentError } from '../contracts/domain/errors';
import type { IDockerService } from '@/shared/services/docker/contracts';

/**
 * In-process directory of connected agents, keyed by owner. Execution resolves the owner's live
 * agent here; if none is connected there is deliberately no fallback — the control plane never
 * runs sandboxes itself, so the operation fails with Agent::NoAgentConnected.
 */
class AgentRegistry{
    // ownerId → (agentId → connection). Newest connection for an agentId wins.
    #byOwner = new Map<number, Map<number, AgentConnection>>();

    register(ownerId: number, agentId: number, connection: AgentConnection): void{
        const agents = this.#byOwner.get(ownerId) ?? new Map<number, AgentConnection>();
        agents.get(agentId)?.dispose();
        agents.set(agentId, connection);
        this.#byOwner.set(ownerId, agents);
    }

    unregister(ownerId: number, agentId: number, connection: AgentConnection): void{
        const agents = this.#byOwner.get(ownerId);
        if(!agents) return;
        // Only remove if this exact connection is still the registered one (a reconnect may have replaced it).
        if(agents.get(agentId) === connection) agents.delete(agentId);
        if(agents.size === 0) this.#byOwner.delete(ownerId);
    }

    isOnline(ownerId: number, agentId: number): boolean{
        return this.#byOwner.get(ownerId)?.has(agentId) ?? false;
    }

    /** Any connected agent for this owner, or undefined. */
    connectionFor(ownerId: number): AgentConnection | undefined{
        const agents = this.#byOwner.get(ownerId);
        if(!agents || agents.size === 0) return undefined;
        return [...agents.values()][0];
    }

    /** A Docker service bound to the owner's agent, or throws when none is connected. */
    dockerFor(ownerId: number): IDockerService{
        const connection = this.connectionFor(ownerId);
        if(!connection) throw AgentError.NoAgentConnected();
        return new RemoteDockerService(connection);
    }

    hasAgent(ownerId: number): boolean{
        return this.connectionFor(ownerId) !== undefined;
    }
}

export const agentRegistry = new AgentRegistry();
