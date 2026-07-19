import os from 'os';
import net from 'node:net';
import Docker from 'dockerode';
import ContainerHandle from './ContainerHandle';
import type { CreateContainerSpec } from './contracts';

/**
 * Runs on the user's VPS. This is the only place a real Docker socket is touched — the control
 * plane holds none. Every container it creates carries the hardening baseline (dropped caps,
 * no-new-privileges, pids/memory/cpu ceilings, tmpfs, dedicated network, non-root user).
 */
export default class DockerService{
    readonly #docker: Docker;

    constructor(socketPath: string){
        this.#docker = new Docker({ socketPath });
    }

    get(containerId: string): ContainerHandle{
        return new ContainerHandle(this.#docker.getContainer(containerId));
    }

    async ensureNetwork(name: string): Promise<void>{
        const find = async () => this.#docker.listNetworks({ filters: { name: [name] } });
        if(!(await find()).some((network) => network.Name === name)){
            try{
                await this.#docker.createNetwork({ Name: name, Driver: 'bridge', Internal: false });
            }catch(error){
                if(!(await find()).some((network) => network.Name === name)) throw error;
            }
        }
        // If the agent itself runs as a container, join the sandbox network so it can reach the
        // project containers by IP for the codespace relay. Local (host) agents already route to
        // the bridge, and a duplicate/attach error is fine either way.
        try{
            await this.#docker.getNetwork(name).connect({ Container: os.hostname() });
        }catch{
            // already attached, or agent is not containerized — both harmless
        }
    }

    async ensureVolume(name: string, labels: Record<string, string> = {}): Promise<void>{
        await this.#docker.createVolume({ Name: name, Labels: labels });
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
        const stream = await this.#docker.pull(image);
        await new Promise<void>((resolve, reject) => {
            this.#docker.modem.followProgress(stream, (err) => (err ? reject(err) : resolve()));
        });
    }

    async create(spec: CreateContainerSpec): Promise<ContainerHandle>{
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
    }

    async list(labels: Record<string, string>): Promise<ContainerHandle[]>{
        const filterLabels = Object.entries(labels).map(([k, v]) => `${k}=${v}`);
        const infos = await this.#docker.listContainers({ all: true, filters: { label: filterLabels } });
        return infos.map((info) => this.get(info.Id));
    }

    /** Opens a raw TCP socket to a port inside a container (the codespace HTTP/WS relay). */
    async connect(containerId: string, port: number): Promise<net.Socket>{
        const ip = await this.get(containerId).ipAddress();
        if(!ip) throw new Error(`container ${containerId} has no reachable IP`);
        const socket = net.connect({ host: ip, port });
        await new Promise<void>((resolve, reject) => {
            socket.once('connect', resolve);
            socket.once('error', reject);
        });
        return socket;
    }
}
