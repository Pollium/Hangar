import { config } from '@/shared/config';
import { agentRegistry } from '../transport/AgentRegistry';
import AgentTokenService from './AgentTokenService';
import Agent from '../models/Agent';
import { AgentError } from '../contracts/domain/errors';
import type { Agent as AgentView, CreatedAgent } from '@hangar/contracts/modules/agent/domain';
import type { CreateAgentInput } from '@hangar/contracts/modules/agent/http';

export default class AgentService{
    #tokens = new AgentTokenService();

    async list(userId: number): Promise<AgentView[]>{
        const agents = await Agent.findBy({ ownerId: userId });
        return agents.map((agent) => this.#view(agent));
    }

    async create(userId: number, input: CreateAgentInput): Promise<CreatedAgent>{
        const secret = this.#tokens.generateSecret();
        const agent = await Agent.create({
            ownerId: userId,
            name: input.name.trim(),
            tokenHash: this.#tokens.hashSecret(secret),
            lastSeenAt: null
        }).save();

        const token = this.#tokens.composeToken(agent.id, secret);
        return { agent: this.#view(agent), token, installCommand: this.#installCommand(token) };
    }

    async remove(userId: number, agentId: number): Promise<void>{
        const agent = await Agent.findOneBy({ id: agentId, ownerId: userId });
        if(!agent) throw AgentError.NotFound();
        await agent.remove();
    }

    #view(agent: Agent): AgentView{
        return {
            id: agent.id,
            name: agent.name,
            status: agentRegistry.isOnline(agent.ownerId, agent.id) ? 'online' : 'offline',
            lastSeenAt: agent.lastSeenAt ? agent.lastSeenAt.toISOString() : null,
            createdAt: agent.createdAt.toISOString(),
            updatedAt: agent.updatedAt.toISOString()
        };
    }

    // The agent runs as a container that only dials out — the Docker socket stays on the user's
    // VPS and is never exposed. The image comes from config so it can change without a rebuild.
    #installCommand(token: string): string{
        return [
            'docker run -d --name hangar-agent --restart unless-stopped --pull always',
            // Lets the agent reach a control plane on the same host in local setups
            // (HANGAR_URL=http://host.docker.internal:PORT). Harmless when the URL is public.
            '--add-host=host.docker.internal:host-gateway',
            '-v /var/run/docker.sock:/var/run/docker.sock',
            `-e HANGAR_URL=${config.publicApiUrl}`,
            `-e HANGAR_TOKEN=${token}`,
            config.agentImage
        ].join(' ');
    }
}
