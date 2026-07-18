import BaseQueue from '@/shared/queues/BaseQueue';
import { logger } from '@/core/utils/Logger';
import DockerService from '@/shared/services/docker/DockerService';
import Sandbox from '@/modules/sandboxes/models/Sandbox';

/**
 * Detects sandboxes that should be running but whose container died (host reboot, manual
 * removal, OOM kill) and flags them so the next session start re-provisions cleanly.
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
        const running = await Sandbox.findBy({ status: 'running' });

        for(const sandbox of running){
            if(!sandbox.containerId) continue;
            try{
                if(await this.#docker.get(sandbox.containerId).isRunning()) continue;
                sandbox.status = 'error';
                await sandbox.save();
                logger.debug('sandbox container down', { scope: 'health-monitor', projectId: sandbox.projectId });
            }catch(error){
                logger.error('health check failed', error, { scope: 'health-monitor', projectId: sandbox.projectId });
            }
        }
    }
}
