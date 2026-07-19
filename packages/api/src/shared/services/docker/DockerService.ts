import os from 'os';
import Docker from 'dockerode';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';
import { DockerError } from '@/shared/errors/DockerError';
import ContainerHandle from './ContainerHandle';
import type { CreateContainerSpec } from './contracts';

/**
 * Facade over dockerode. Every container it creates carries the hardening baseline
 * (dropped caps, no-new-privileges, pids/memory/cpu ceilings, tmpfs, dedicated network,
 * non-root user from the image). Callers pass a spec; they never assemble HostConfig
 * themselves, so the security posture cannot drift per call site.
 */
export default class DockerService{
    readonly #docker: Docker;

    constructor(docker?: Docker){
        this.#docker = docker ?? new Docker({ socketPath: config.docker.socket });
    }

    get(containerId: string): ContainerHandle{
        return new ContainerHandle(this.#docker.getContainer(containerId));
    }

    async ensureNetwork(name: string): Promise<void>{
        const find = async () => this.#docker.listNetworks({ filters: { name: [name] } });
        if((await find()).some((network) => network.Name === name)) return;
        try{
            await this.#docker.createNetwork({ Name: name, Driver: 'bridge', Internal: false });
            logger.debug(name, { scope: 'docker.network.create' });
        }catch(error){
            // Another request/process may have created it after our list call.
            if((await find()).some((network) => network.Name === name)) return;
            throw error;
        }
    }

    /**
     * Attaches the API's own container to the sandbox network so it can reach a project
     * container by name (`cc-<ns>-project-<id>:<port>`) — the codespace HTTP proxy needs a
     * route the socket-only control plane otherwise lacks. Idempotent, and a no-op outside a
     * container (dev): failures never block sandbox lifecycle, they only mean no codespace.
     */
    async connectSelf(network: string): Promise<void>{
        try{
            await this.#docker.getNetwork(network).connect({ Container: os.hostname() });
            logger.debug(network, { scope: 'docker.network.connect' });
        }catch(error){
            const message = error instanceof Error ? error.message.toLowerCase() : '';
            if(message.includes('already exists') || message.includes('already attached')) return;
            logger.warn('could not join sandbox network', { scope: 'docker.network.connect', network });
        }
    }

    async ensureVolume(name: string, labels: Record<string, string> = {}): Promise<void>{
        await this.#docker.createVolume({ Name: name, Labels: labels });
        const info = await this.#docker.getVolume(name).inspect();
        const actual = info.Labels ?? {};
        if(Object.entries(labels).some(([key, value]) => actual[key] !== value)){
            throw DockerError.CreateFailed(`volume-identity:${name}`);
        }
    }

    async imageExists(image: string): Promise<boolean>{
        try{
            await this.#docker.getImage(image).inspect();
            return true;
        }catch{
            return false;
        }
    }

    async pull(image: string): Promise<void>{
        try{
            const stream = await this.#docker.pull(image);
            await new Promise<void>((resolve, reject) => {
                this.#docker.modem.followProgress(stream, (err) => (err ? reject(err) : resolve()));
            });
            logger.debug(image, { scope: 'docker.pull' });
        }catch(error){
            logger.error('docker pull failed', error, { scope: 'docker.pull', image });
            throw DockerError.PullFailed(image);
        }
    }

    async create(spec: CreateContainerSpec): Promise<ContainerHandle>{
        try{
            const container = await this.#docker.createContainer({
                name: spec.name,
                Image: spec.image,
                Labels: spec.labels,
                Env: spec.env,
                WorkingDir: spec.workdir,
                Cmd: spec.keeperCommand,
                Tty: true,
                HostConfig: {
                    Memory: spec.limits.memoryMb * 1_048_576,
                    NanoCpus: Math.round(spec.limits.cpus * 1e9),
                    PidsLimit: spec.limits.pidsLimit,
                    CapDrop: ['ALL'],
                    SecurityOpt: ['no-new-privileges'],
                    NetworkMode: spec.network,
                    Binds: [`${spec.volumeName}:/workspace`],
                    Tmpfs: { '/tmp': 'rw,nosuid,nodev,size=256m' },
                    RestartPolicy: { Name: 'unless-stopped' }
                }
            });
            return new ContainerHandle(container);
        }catch(error){
            logger.error('docker create failed', error, { scope: 'docker.create', name: spec.name });
            throw DockerError.CreateFailed(spec.name);
        }
    }

    async list(labels: Record<string, string>): Promise<ContainerHandle[]>{
        const filterLabels = Object.entries(labels).map(([k, v]) => `${k}=${v}`);
        const infos = await this.#docker.listContainers({ all: true, filters: { label: filterLabels } });
        return infos.map((info) => this.get(info.Id));
    }
}
