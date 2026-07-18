import type Docker from 'dockerode';
import { PassThrough } from 'node:stream';
import { openPty } from './ExecStream';
import type { ExecOptions, ExecResult, ContainerStats, PtyStream } from './contracts';

/** Thin wrapper over a dockerode Container with the operations sessions and sandboxes need. */
export default class ContainerHandle{
    readonly #container: Docker.Container;

    constructor(container: Docker.Container){
        this.#container = container;
    }

    get id(): string{
        return this.#container.id;
    }

    async start(): Promise<void>{
        await this.#container.start();
    }

    async stop(): Promise<void>{
        try{
            await this.#container.stop({ t: 5 });
        }catch{
            // already stopped or gone — treat as idempotent
        }
    }

    async remove(withVolumes = false): Promise<void>{
        await this.#container.remove({ force: true, v: withVolumes });
    }

    async isRunning(): Promise<boolean>{
        try{
            const info = await this.#container.inspect();
            return info.State.Running === true;
        }catch{
            return false;
        }
    }

    /** Runs a one-shot command and collects its combined output. */
    async exec(cmd: string[], opts: ExecOptions = {}): Promise<ExecResult>{
        const exec = await this.#container.exec({
            Cmd: cmd,
            AttachStdout: true,
            AttachStderr: true,
            WorkingDir: opts.cwd,
            Env: opts.env
        });

        const stream = await exec.start({});
        const stdout = new PassThrough();
        const stderr = new PassThrough();
        this.#container.modem.demuxStream(stream, stdout, stderr);

        const chunks: Buffer[] = [];
        stdout.on('data', (c: Buffer) => chunks.push(c));
        stderr.on('data', (c: Buffer) => chunks.push(c));

        await new Promise<void>((resolve, reject) => {
            stream.on('end', resolve);
            stream.on('error', reject);
        });

        const { ExitCode } = await exec.inspect();
        return { output: Buffer.concat(chunks).toString('utf8'), exitCode: ExitCode ?? 0 };
    }

    openPty(cmd: string[], opts: ExecOptions = {}): Promise<PtyStream>{
        return openPty(this.#container, cmd, opts);
    }

    async stats(): Promise<ContainerStats>{
        const raw = await this.#container.stats({ stream: false });
        return this.#computeStats(raw);
    }

    #computeStats(raw: Docker.ContainerStats): ContainerStats{
        const cpuDelta = raw.cpu_stats.cpu_usage.total_usage - raw.precpu_stats.cpu_usage.total_usage;
        const systemDelta = raw.cpu_stats.system_cpu_usage - raw.precpu_stats.system_cpu_usage;
        const cores = raw.cpu_stats.online_cpus || raw.cpu_stats.cpu_usage.percpu_usage?.length || 1;
        const cpuPercent = systemDelta > 0 && cpuDelta > 0 ? (cpuDelta / systemDelta) * cores * 100 : 0;

        return {
            cpuPercent: Math.round(cpuPercent * 10) / 10,
            memUsedMb: Math.round((raw.memory_stats.usage ?? 0) / 1_048_576),
            memLimitMb: Math.round((raw.memory_stats.limit ?? 0) / 1_048_576)
        };
    }
}
