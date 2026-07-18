import { In } from 'typeorm';
import BaseQueue from '@/shared/queues/BaseQueue';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';
import DockerService from '@/shared/services/docker/DockerService';
import Sandbox from '@/modules/sandboxes/models/Sandbox';
import Session from '@/modules/sessions/models/Session';

/**
 * Stops sandboxes that have no active session and have been idle past the timeout, freeing
 * VPS memory. The volume persists, so reopening a session re-starts the sandbox. This is what
 * lets a host run far more sessions than it has RAM for — only active ones consume resources.
 */
export default class IdleReaperQueue extends BaseQueue<Record<string, never>>{
    readonly name = 'idle-reaper';
    #docker: DockerService;

    constructor(docker: DockerService = new DockerService()){
        super();
        this.#docker = docker;
    }

    startWorker(){
        const worker = super.startWorker();
        void this.schedule({ every: 300_000 });
        return worker;
    }

    async process(): Promise<void>{
        const running = await Sandbox.findBy({ status: 'running' });
        const now = Date.now();

        for(const sandbox of running){
            const active = await Session.countBy({
                projectId: sandbox.projectId,
                status: In(['starting', 'running', 'waiting_input'])
            });
            if(active > 0) continue;

            const idleFor = now - (sandbox.lastStartedAt?.getTime() ?? 0);
            if(idleFor < config.docker.idleTimeoutMs) continue;

            try{
                if(sandbox.containerId) await this.#docker.get(sandbox.containerId).stop();
                sandbox.status = 'stopped';
                await sandbox.save();
                logger.debug('reaped idle sandbox', { scope: 'idle-reaper', projectId: sandbox.projectId });
            }catch(error){
                logger.error('idle reap failed', error, { scope: 'idle-reaper', projectId: sandbox.projectId });
            }
        }
    }
}
