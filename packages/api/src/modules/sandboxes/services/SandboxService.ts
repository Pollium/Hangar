import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';
import { eventBus } from '@/shared/events/EventBus';
import { agentRegistry } from '@/modules/agents/transport/AgentRegistry';
import ProjectService from '@/modules/projects/services/ProjectService';
import type { IDockerService, IContainerHandle } from '@/shared/services/docker/contracts';
import type Project from '@/modules/projects/models/Project';
import Sandbox from '../models/Sandbox';
import SandboxProvisioner from './SandboxProvisioner';
import { SandboxError } from '../contracts/domain/errors';
import type { SandboxUsage } from '@hangar/contracts/modules/sandbox/domain';

// All service instances in this API process share the same project provisioning flight.
const provisionFlights = new Map<string, Promise<Sandbox>>();

/**
 * Manages a project's sandbox — but never on the control-plane host. Every Docker operation runs
 * on the project owner's connected agent (their VPS); with no agent online the owner's sandboxes
 * simply cannot run (Agent::NoAgentConnected), by design.
 */
export default class SandboxService{
    #projects = new ProjectService();
    #provisioner = new SandboxProvisioner();

    /** Docker bound to the given owner's live agent, or throws when none is connected. */
    #dockerFor(ownerId: number): IDockerService{
        return agentRegistry.dockerFor(ownerId);
    }

    async status(userId: number, projectId: number): Promise<Sandbox>{
        await this.#projects.get(userId, projectId);
        const sandbox = await Sandbox.findOneBy({ projectId });
        if(!sandbox) throw SandboxError.NotFound();
        return sandbox;
    }

    async provision(userId: number, projectId: number): Promise<Sandbox>{
        const project = await this.#projects.get(userId, projectId);
        const key = `${config.docker.namespace}:${project.id}`;
        const active = provisionFlights.get(key);
        if(active) return active;

        const task = this.#provisionProject(project);
        provisionFlights.set(key, task);
        try{
            return await task;
        }finally{
            if(provisionFlights.get(key) === task) provisionFlights.delete(key);
        }
    }

    async start(userId: number, projectId: number): Promise<Sandbox>{
        const project = await this.#projects.get(userId, projectId);
        const sandbox = await Sandbox.findOneBy({ projectId });
        if(!sandbox) throw SandboxError.NotFound();
        if(!sandbox.containerId) return this.provision(userId, projectId);

        const handle = this.#dockerFor(sandbox.ownerId).get(sandbox.containerId);
        if(!(await handle.isRunning())){
            try{
                await handle.start();
            }catch{
                sandbox.containerId = null;
                sandbox.status = 'error';
                await sandbox.save();
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
        if(sandbox.containerId) await this.#dockerFor(sandbox.ownerId).get(sandbox.containerId).stop();
        sandbox.status = 'stopped';
        await sandbox.save();
        this.#emit('sandbox.stopped', sandbox);
        return sandbox;
    }

    async destroy(userId: number, projectId: number): Promise<void>{
        const sandbox = await this.status(userId, projectId);
        if(sandbox.containerId){
            try{
                await this.#dockerFor(sandbox.ownerId).get(sandbox.containerId).remove(false);
            }catch{
                // container already gone or agent offline — the row is removed regardless
            }
        }
        await sandbox.remove();
    }

    async usage(userId: number, projectId: number): Promise<SandboxUsage>{
        const sandbox = await this.status(userId, projectId);
        if(sandbox.status !== 'running' || !sandbox.containerId){
            return { cpuPercent: 0, memUsedMb: 0, memLimitMb: sandbox.limits.memoryMb };
        }
        return this.#dockerFor(sandbox.ownerId).get(sandbox.containerId).stats();
    }

    /** Provisions or starts as needed and returns the live container on the owner's agent. */
    async ensureRunning(userId: number, projectId: number): Promise<{ sandbox: Sandbox; handle: IContainerHandle }>{
        let sandbox = await Sandbox.findOneBy({ projectId });
        if(!sandbox || !sandbox.containerId){
            sandbox = await this.provision(userId, projectId);
        }else{
            const current = this.#dockerFor(sandbox.ownerId).get(sandbox.containerId);
            if(sandbox.status !== 'running' || !(await current.isRunning())){
                sandbox = await this.start(userId, projectId);
            }
        }
        return { sandbox, handle: this.#dockerFor(sandbox.ownerId).get(sandbox.containerId as string) };
    }

    async #provisionProject(project: Project): Promise<Sandbox>{
        const sandbox = await this.#ensureRow(project.id, project.ownerId);
        sandbox.status = 'provisioning';
        await sandbox.save();

        try{
            const docker = this.#dockerFor(project.ownerId);
            const handle = await this.#provisioner.provision(project, sandbox, docker);
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

    async #ensureRow(projectId: number, ownerId: number): Promise<Sandbox>{
        const expectedVolume = this.#provisioner.volumeName(projectId);
        const existing = await Sandbox.findOneBy({ projectId });
        if(existing){
            if(!existing.containerId && existing.volumeName !== expectedVolume){
                existing.volumeName = expectedVolume;
                await existing.save();
            }
            return existing;
        }
        return Sandbox.create({
            projectId,
            ownerId,
            containerId: null,
            volumeName: expectedVolume,
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
