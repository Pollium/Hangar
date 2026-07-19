import { eventBus } from '@/shared/events/EventBus';
import ProjectService from '@/modules/projects/services/ProjectService';
import { getAdapter } from '@/modules/clis/adapters/registry';
import Session from '../models/Session';
import SessionEvent from '../models/SessionEvent';
import { SessionError } from '../contracts/domain/errors';
import SessionRuntimeService from './SessionRuntimeService';
import { terminalBridge } from './TerminalBridge';
import type { CreateSessionInput } from '@cloud-code/contracts/modules/session/http';

export default class SessionService{
    #projects = new ProjectService();
    #runtime = new SessionRuntimeService();

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
        const saved = await entity.save() as Session;
        eventBus.emit('session.status_changed', {
            sessionId: saved.id,
            ownerId: saved.ownerId,
            projectId: saved.projectId,
            status: 'starting'
        });
        return saved;
    }

    async list(userId: number, projectId: number): Promise<Session[]>{
        await this.#projects.get(userId, projectId);
        return Session.find({
            where: { projectId },
            order: { lastActiveAt: 'DESC' }
        });
    }

    async get(userId: number, sessionId: number): Promise<Session>{
        const session = await Session.findOneBy({ id: sessionId });
        if(!session) throw SessionError.NotFound();
        if(!(await this.#projects.isMember(userId, session.projectId))) throw SessionError.Forbidden();
        return session;
    }

    async stop(userId: number, sessionId: number): Promise<Session>{
        const session = await this.get(userId, sessionId);
        return this.#runtime.stop(session, () => terminalBridge.release(session.id, 'stopped'));
    }

    async switchCli(userId: number, sessionId: number, cliType: string): Promise<Session>{
        const session = await this.get(userId, sessionId);
        // Validate the CLI up front — throws Cli::UnknownCli otherwise.
        getAdapter(cliType);
        return this.#runtime.switchCli(session, cliType, () => terminalBridge.release(session.id, 'restarted'));
    }

    async remove(userId: number, sessionId: number): Promise<void>{
        const session = await this.get(userId, sessionId);
        await this.#runtime.remove(session, () => terminalBridge.release(session.id, 'removed'));
    }

    async events(userId: number, sessionId: number): Promise<SessionEvent[]>{
        await this.get(userId, sessionId);
        return SessionEvent.find({ where: { sessionId }, order: { id: 'ASC' } });
    }
}
