import SessionService from '@/modules/sessions/services/SessionService';
import type SessionEntity from '@/modules/sessions/models/Session';
import type { Session } from '@cloud-code/contracts/modules/session/domain';

const serialize = (entity: SessionEntity): Session => ({
    id: entity.id,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
    projectId: entity.projectId,
    ownerId: entity.ownerId,
    title: entity.title,
    cliType: entity.cliType,
    status: entity.status,
    containerId: entity.containerId,
    tmuxWindow: entity.tmuxWindow,
    cwd: entity.cwd,
    lastActiveAt: entity.lastActiveAt?.toISOString() ?? null
});

export default class FleetService{
    #sessions = new SessionService();

    async snapshot(userId: number): Promise<Session[]>{
        return (await this.#sessions.list(userId)).map(serialize);
    }

    async session(userId: number, sessionId: number): Promise<Session>{
        return serialize(await this.#sessions.get(userId, sessionId));
    }
}
