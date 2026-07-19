import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';
import { eventBus } from '@/shared/events/EventBus';
import DockerService from '@/shared/services/docker/DockerService';
import type ContainerHandle from '@/shared/services/docker/ContainerHandle';
import ProjectService from '@/modules/projects/services/ProjectService';
import type Project from '@/modules/projects/models/Project';
import Sandbox from '../models/Sandbox';
import SandboxProvisioner from './SandboxProvisioner';
import { SandboxError } from '../contracts/domain/errors';
import type { SandboxUsage } from '@cloud-code/contracts/modules/sandbox/domain';

// All service instances in this API process share the same project provisioning flight.
const provisionFlights = new Map<string, Promise<Sandbox>>();

// The API only needs to join the sandbox network once per process — subsequent joins are
// no-ops, so we skip the extra daemon round-trip on every attach after the first.
let networkJoined = false;

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
        // Container gone (host cleanup / manual removal) → clear the stale identity before a
        // fresh provision. This prevents a new namespaced container from mounting a global
        // legacy volume that can no longer be tied to this exact container.
        if(!sandbox.containerId) return this.provision(userId, projectId);

        const handle = this.#docker.get(sandbox.containerId);
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
        if(!networkJoined){
            await this.#docker.connectSelf(config.docker.network);
            networkJoined = true;
        }
        let sandbox = await Sandbox.findOneBy({ projectId });
        if(!sandbox || !sandbox.containerId){
            sandbox = await this.provision(userId, projectId);
        }else{
            const current = this.#docker.get(sandbox.containerId);
            if(sandbox.status !== 'running' || !(await current.isRunning())){
                sandbox = await this.start(userId, projectId);
            }
        }
        return { sandbox, handle: this.#docker.get(sandbox.containerId as string) };
    }

    async #provisionProject(project: Project): Promise<Sandbox>{
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

    async #ensureRow(projectId: number, ownerId: number): Promise<Sandbox>{
        const expectedVolume = this.#provisioner.volumeName(projectId);
        const existing = await Sandbox.findOneBy({ projectId });
        if(existing){
            // An unattached legacy volume has no trustworthy deployment identity. Quarantine
            // it (do not delete/copy/mount it) and use a fresh labelled namespaced volume.
            if(!existing.containerId && existing.volumeName !== expectedVolume){
                logger.warn('quarantining unverified legacy sandbox volume', {
                    scope: 'sandbox.migrate',
                    projectId,
                    legacyVolume: existing.volumeName,
                    replacementVolume: expectedVolume
                });
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
