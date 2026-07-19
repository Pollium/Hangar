import type { BaseEntity } from '../../shared/base';

export type AgentStatus = 'online' | 'offline';

/** A user's compute host (their VPS) running the outbound agent. Projects run their sandboxes
 *  and codespaces here — never on the control-plane server. */
export interface Agent extends BaseEntity{
    name: string;
    status: AgentStatus;
    lastSeenAt: string | null;
}

/** Returned once on creation: the plaintext token is shown only here, then stored hashed. */
export interface CreatedAgent{
    agent: Agent;
    token: string;
    installCommand: string;
}
