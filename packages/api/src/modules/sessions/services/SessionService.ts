import ProjectService from '@/modules/projects/services/ProjectService';
import { getAdapter } from '@/modules/clis/adapters/registry';
import Session from '../models/Session';
import SessionEvent from '../models/SessionEvent';
import { SessionError } from '../contracts/domain/errors';
import type { CreateSessionInput } from '@cloud-code/contracts/modules/session/http';

export default class SessionService{
    #projects = new ProjectService();

    async create(userId: number, input: CreateSessionInput): Promise<Session>{
        const project = await this.#projects.get(userId, input.projectId);
        // Validate the CLI up front — throws Cli::UnknownCli otherwise.
        getAdapter(input.cliType);

        const entity = Session.create({
            projectId: project.id,
            ownerId: userId,
            title: input.title?.trim() || `${project.name} · ${input.cliType}`,
            cliType: input.cliType,
            status: 'starting',
            containerId: null,
            tmuxWindow: null,
            cwd: '/workspace',
            lastActiveAt: new Date()
        });
        return entity.save() as Promise<Session>;
    }

    list(userId: number, projectId?: number): Promise<Session[]>{
        return Session.find({
            where: projectId ? { ownerId: userId, projectId } : { ownerId: userId },
            order: { lastActiveAt: 'DESC' }
        });
    }

    async get(userId: number, sessionId: number): Promise<Session>{
        const session = await Session.findOneBy({ id: sessionId });
        if(!session) throw SessionError.NotFound();
        if(session.ownerId !== userId) throw SessionError.Forbidden();
        return session;
    }

    async stop(userId: number, sessionId: number): Promise<Session>{
        const session = await this.get(userId, sessionId);
        session.status = 'stopped';
        return session.save() as Promise<Session>;
    }

    async remove(userId: number, sessionId: number): Promise<void>{
        const session = await this.get(userId, sessionId);
        await session.remove();
    }

    async events(userId: number, sessionId: number): Promise<SessionEvent[]>{
        await this.get(userId, sessionId);
        return SessionEvent.find({ where: { sessionId }, order: { id: 'ASC' } });
    }
}
