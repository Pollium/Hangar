import { config } from '@/shared/config';
import { eventBus } from '@/shared/events/EventBus';
import DockerService from '@/shared/services/docker/DockerService';
import type ContainerHandle from '@/shared/services/docker/ContainerHandle';
import ProjectService from '@/modules/projects/services/ProjectService';
import Sandbox from '../models/Sandbox';
import SandboxProvisioner from './SandboxProvisioner';
import { SandboxError } from '../contracts/domain/errors';
import type { SandboxUsage } from '@cloud-code/contracts/modules/sandbox/domain';

export default class SandboxService{
    #projects = new ProjectService();
    #docker: DockerService;
    #provisioner: SandboxProvisioner;

    constructor(docker: DockerService = new DockerService()){
        this.#docker = docker;
        this.#provisioner = new SandboxProvisioner(docker);
    }

    async status(userId: number, projectId: number): Promise<Sandbox>{
        await this.#projects.get(userId, projectId);
        const sandbox = await Sandbox.findOneBy({ projectId });
        if(!sandbox) throw SandboxError.NotFound();
        return sandbox;
    }

    async provision(userId: number, projectId: number): Promise<Sandbox>{
        const project = await this.#projects.get(userId, projectId);
        const sandbox = await this.#ensureRow(project.id, project.ownerId);

        sandbox.status = 'provisioning';
        await sandbox.save();

        try{
            const handle = await this.#provisioner.provision(project, sandbox);
            sandbox.containerId = handle.id;
            sandbox.status = 'running';
            sandbox.lastStartedAt = new Date();
            await sandbox.save();
            this.#emit('sandbox.started', sandbox);
            return sandbox;
        }catch(error){
            sandbox.status = 'error';
            await sandbox.save();
            throw SandboxError.ProvisionFailed(error instanceof Error ? error.message : undefined);
        }
    }

    async start(userId: number, projectId: number): Promise<Sandbox>{
        const project = await this.#projects.get(userId, projectId);
        const sandbox = await Sandbox.findOneBy({ projectId });
        if(!sandbox) throw SandboxError.NotFound();
        // Container gone (host reboot / manual removal) → provision fresh.
        if(!sandbox.containerId) return this.provision(userId, projectId);

        const handle = this.#docker.get(sandbox.containerId);
        if(!(await handle.isRunning())){
            try{
                await handle.start();
            }catch{
                return this.provision(userId, projectId);
            }
        }
        sandbox.status = 'running';
        sandbox.lastStartedAt = new Date();
        await sandbox.save();
        this.#emit('sandbox.started', sandbox);
        void project;
        return sandbox;
    }

    async stop(userId: number, projectId: number): Promise<Sandbox>{
        const sandbox = await this.status(userId, projectId);
        if(sandbox.containerId) await this.#docker.get(sandbox.containerId).stop();
        sandbox.status = 'stopped';
        await sandbox.save();
        this.#emit('sandbox.stopped', sandbox);
        return sandbox;
    }

    async destroy(userId: number, projectId: number): Promise<void>{
        const sandbox = await this.status(userId, projectId);
        if(sandbox.containerId){
            try{
                await this.#docker.get(sandbox.containerId).remove(false);
            }catch{
                // container already gone
            }
        }
        await sandbox.remove();
    }

    async usage(userId: number, projectId: number): Promise<SandboxUsage>{
        const sandbox = await this.status(userId, projectId);
        if(sandbox.status !== 'running' || !sandbox.containerId){
            return { cpuPercent: 0, memUsedMb: 0, memLimitMb: sandbox.limits.memoryMb };
        }
        return this.#docker.get(sandbox.containerId).stats();
    }

    /** Provisions or starts as needed and returns the live container. Used by session runtime. */
    async ensureRunning(userId: number, projectId: number): Promise<{ sandbox: Sandbox; handle: ContainerHandle }>{
        let sandbox = await Sandbox.findOneBy({ projectId });
        if(!sandbox || !sandbox.containerId || sandbox.status !== 'running'){
            sandbox = sandbox ? await this.start(userId, projectId) : await this.provision(userId, projectId);
        }
        return { sandbox, handle: this.#docker.get(sandbox.containerId as string) };
    }

    async #ensureRow(projectId: number, ownerId: number): Promise<Sandbox>{
        const existing = await Sandbox.findOneBy({ projectId });
        if(existing) return existing;
        return Sandbox.create({
            projectId,
            ownerId,
            containerId: null,
            volumeName: this.#provisioner.volumeName(projectId),
            status: 'provisioning',
            limits: {
                memoryMb: config.docker.defaultMemoryMb,
                cpus: config.docker.defaultCpus,
                pidsLimit: config.docker.defaultPidsLimit
            },
            lastStartedAt: null
        }).save();
    }

    #emit(event: 'sandbox.started' | 'sandbox.stopped', sandbox: Sandbox): void{
        eventBus.emit(event, { sandboxId: sandbox.id, projectId: sandbox.projectId, ownerId: sandbox.ownerId });
    }
}
