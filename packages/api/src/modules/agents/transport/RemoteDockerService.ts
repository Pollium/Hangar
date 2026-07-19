import type AgentConnection from './AgentConnection';
import type {
    IDockerService,
    IContainerHandle,
    CreateContainerSpec,
    ExecOptions,
    ExecResult,
    ContainerStats,
    PtyStream
} from '@/shared/services/docker/contracts';

/** A container handle whose every operation is an RPC to the owning agent. */
class RemoteContainerHandle implements IContainerHandle{
    #conn: AgentConnection;
    readonly id: string;

    constructor(conn: AgentConnection, id: string){
        this.#conn = conn;
        this.id = id;
    }

    async start(): Promise<void>{ await this.#conn.request('container.start', { id: this.id }); }
    async stop(): Promise<void>{ await this.#conn.request('container.stop', { id: this.id }); }
    async remove(withVolumes = false): Promise<void>{ await this.#conn.request('container.remove', { id: this.id, withVolumes }); }

    async isRunning(): Promise<boolean>{
        return (await this.#conn.request<{ running: boolean }>('container.isRunning', { id: this.id })).running;
    }

    async volumeAt(destination: string): Promise<string | undefined>{
        return (await this.#conn.request<{ name: string | null }>('container.volumeAt', { id: this.id, destination })).name ?? undefined;
    }

    exec(cmd: string[], opts: ExecOptions = {}): Promise<ExecResult>{
        return this.#conn.request<ExecResult>('container.exec', { id: this.id, cmd, opts });
    }

    stats(): Promise<ContainerStats>{
        return this.#conn.request<ContainerStats>('container.stats', { id: this.id });
    }

    async openPty(cmd: string[], opts: ExecOptions = {}): Promise<PtyStream>{
        const stream = this.#conn.openStream('pty.open', { id: this.id, cmd, opts });
        await stream.whenReady;
        return stream;
    }
}

/** Implements the Docker surface entirely over an agent tunnel — the control plane owns no socket. */
export default class RemoteDockerService implements IDockerService{
    #conn: AgentConnection;

    constructor(conn: AgentConnection){
        this.#conn = conn;
    }

    get(containerId: string): IContainerHandle{
        return new RemoteContainerHandle(this.#conn, containerId);
    }

    async ensureNetwork(name: string): Promise<void>{ await this.#conn.request('docker.ensureNetwork', { name }); }
    async ensureVolume(name: string, labels: Record<string, string> = {}): Promise<void>{ await this.#conn.request('docker.ensureVolume', { name, labels }); }

    async imageExists(image: string): Promise<boolean>{
        return (await this.#conn.request<{ exists: boolean }>('docker.imageExists', { image })).exists;
    }

    async pull(image: string): Promise<void>{ await this.#conn.request('docker.pull', { image }); }

    async create(spec: CreateContainerSpec): Promise<IContainerHandle>{
        const { id } = await this.#conn.request<{ id: string }>('docker.create', { spec });
        return new RemoteContainerHandle(this.#conn, id);
    }

    async list(labels: Record<string, string>): Promise<IContainerHandle[]>{
        const { ids } = await this.#conn.request<{ ids: string[] }>('docker.list', { labels });
        return ids.map((id) => new RemoteContainerHandle(this.#conn, id));
    }

    async connect(containerId: string, port: number): Promise<PtyStream>{
        const stream = this.#conn.openStream('tcp.open', { id: containerId, port });
        await stream.whenReady;
        return stream;
    }
}
