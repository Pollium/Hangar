import { In } from 'typeorm';
import BaseQueue from '@/shared/queues/BaseQueue';
import { logger } from '@/core/utils/Logger';
import { eventBus } from '@/shared/events/EventBus';
import { DockerError } from '@/shared/errors/DockerError';
import DockerService from '@/shared/services/docker/DockerService';
import Sandbox from '@/modules/sandboxes/models/Sandbox';
import Session from '@/modules/sessions/models/Session';

const ACTIVE_SESSION_STATUSES = ['starting', 'running', 'waiting_input', 'idle'] as const;

/**
 * Detects sandboxes and sessions that claim to be active after their container/tmux process
 * died. Stale rows become error so Fleet never presents a dead agent as running.
 */
export default class HealthMonitorQueue extends BaseQueue<Record<string, never>>{
    readonly name = 'health-monitor';
    #docker: DockerService;

    constructor(docker: DockerService = new DockerService()){
        super();
        this.#docker = docker;
    }

    startWorker(){
        const worker = super.startWorker();
        void this.schedule({ every: 60_000 });
        return worker;
    }

    async process(): Promise<void>{
        const runningSandboxes = await Sandbox.findBy({ status: 'running' });

        for(const sandbox of runningSandboxes){
            if(!sandbox.containerId) continue;
            try{
                if(await this.#docker.get(sandbox.containerId).isRunning()) continue;

                const query = Sandbox.createQueryBuilder()
                    .update(Sandbox)
                    .set({ status: 'error' })
                    .where('id = :id', { id: sandbox.id })
                    .andWhere('status = :status', { status: 'running' })
                    .andWhere('containerId = :containerId', { containerId: sandbox.containerId });
                if(sandbox.lastStartedAt){
                    query.andWhere('lastStartedAt = :lastStartedAt', { lastStartedAt: sandbox.lastStartedAt });
                }else{
                    query.andWhere('lastStartedAt IS NULL');
                }
                const result = await query.execute();
                if(result.affected){
                    logger.debug('sandbox container down', { scope: 'health-monitor', projectId: sandbox.projectId });
                }
            }catch(error){
                logger.error('health check failed', error, { scope: 'health-monitor', projectId: sandbox.projectId });
            }
        }

        const activeSessions = await Session.findBy({ status: In([...ACTIVE_SESSION_STATUSES]) });
        for(const session of activeSessions){
            if(!session.containerId || !session.tmuxWindow) continue;
            try{
                const container = this.#docker.get(session.containerId);
                let alive = await container.isRunning();
                if(alive){
                    const probe = await container.exec(['tmux', 'has-session', '-t', session.tmuxWindow]);
                    if(probe.exitCode === 0) alive = true;
                    else if(probe.exitCode === 1) alive = false;
                    else throw DockerError.ExecFailed('tmux-health-check');
                }
                if(alive) continue;

                const expectedActivity = session.lastActiveAt;
                const query = Session.createQueryBuilder()
                    .update(Session)
                    .set({ status: 'error', lastActiveAt: new Date() })
                    .where('id = :id', { id: session.id })
                    .andWhere('status IN (:...statuses)', { statuses: [...ACTIVE_SESSION_STATUSES] });
                if(expectedActivity){
                    query.andWhere('lastActiveAt = :expectedActivity', { expectedActivity });
                }else{
                    query.andWhere('lastActiveAt IS NULL');
                }
                const result = await query.execute();
                if(!result.affected) continue;

                eventBus.emit('session.status_changed', {
                    sessionId: session.id,
                    ownerId: session.ownerId,
                    status: 'error'
                });
                logger.debug('session tmux down', { scope: 'health-monitor', sessionId: session.id });
            }catch(error){
                logger.error('session health check failed', error, { scope: 'health-monitor', sessionId: session.id });
            }
        }
    }
}
