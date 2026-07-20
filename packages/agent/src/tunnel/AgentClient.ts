import WebSocket from 'ws';
import type { Duplex } from 'node:stream';
import DockerService from '@/docker/DockerService';
import type { PtyStream } from '@/docker/contracts';
import type {
    ControlToAgent,
    RpcRequest,
    AgentToControl,
    ExecPayload,
    PtyOpenPayload,
    TcpOpenPayload,
    CreateContainerSpecWire
} from '@hangar/contracts/modules/agent/protocol';

const RECONNECT_MS = 2000;
// Ping the control plane on this cadence. A dead link is detected within ~2 intervals (one to
// ping, one to notice no pong), so recovery is ≤2×HEARTBEAT_MS.
const HEARTBEAT_MS = 30000;

/**
 * The agent side of the tunnel. Dials the control plane (outbound only — no inbound ports),
 * authenticates with the agent token, then executes the Docker RPCs it receives against the
 * local daemon and relays PTY / TCP streams. Reconnects forever.
 */
export class AgentClient{
    readonly #url: string;
    readonly #token: string;
    readonly #docker: DockerService;
    #ws: WebSocket | undefined;
    #streams = new Map<string, Duplex>();
    #heartbeat: ReturnType<typeof setInterval> | undefined;
    #alive = false;

    constructor(url: string, token: string, dockerSocket: string){
        this.#url = url;
        this.#token = token;
        this.#docker = new DockerService(dockerSocket);
    }

    start(): void{
        this.#connect();
    }

    #connect(): void{
        const ws = new WebSocket(`${this.#url}/agents/gateway`, this.#token);
        this.#ws = ws;

        ws.on('open', () => {
            console.log('[agent] connected to control plane');
            this.#alive = true;
            this.#startHeartbeat();
        });
        ws.on('pong', () => { this.#alive = true; });
        ws.on('message', (raw: WebSocket.RawData) => { void this.#onFrame(raw.toString()); });
        ws.on('error', (error: Error) => console.error('[agent] socket error:', error.message));
        ws.on('close', () => {
            console.warn(`[agent] disconnected, reconnecting in ${RECONNECT_MS}ms`);
            this.#reset();
            setTimeout(() => this.#connect(), RECONNECT_MS);
        });
    }

    /**
     * Liveness heartbeat. A control-plane restart can leave this socket half-open — no close frame
     * survives the outbound proxy chain (NPM/Caddy), so `ws` never fires 'close' and the agent would
     * sit on a zombie connection forever. Pinging and terminating on a missed pong forces the 'close'
     * path (and thus the reconnect) even when the drop was silent.
     */
    #startHeartbeat(): void{
        this.#stopHeartbeat();
        this.#heartbeat = setInterval(() => {
            const ws = this.#ws;
            if(!ws) return;
            if(!this.#alive){ ws.terminate(); return; }
            this.#alive = false;
            try{ ws.ping(); }catch{ /* ping on a closing socket throws; the close handler reconnects */ }
        }, HEARTBEAT_MS);
    }

    #stopHeartbeat(): void{
        if(this.#heartbeat){ clearInterval(this.#heartbeat); this.#heartbeat = undefined; }
    }

    #reset(): void{
        this.#stopHeartbeat();
        this.#alive = false;
        for(const stream of this.#streams.values()) stream.destroy();
        this.#streams.clear();
        this.#ws = undefined;
    }

    #send(frame: AgentToControl): void{
        if(this.#ws?.readyState === WebSocket.OPEN) this.#ws.send(JSON.stringify(frame));
    }

    async #onFrame(raw: string): Promise<void>{
        let frame: ControlToAgent;
        try{
            frame = JSON.parse(raw) as ControlToAgent;
        }catch{
            return;
        }

        if(frame.t === 'req'){ await this.#onRequest(frame); return; }
        if(frame.t === 'sd'){ this.#streams.get(frame.sid)?.write(Buffer.from(frame.b64, 'base64')); return; }
        if(frame.t === 'sr'){ (this.#streams.get(frame.sid) as PtyStream | undefined)?.resize?.(frame.cols, frame.rows); return; }
        if(frame.t === 'sc'){ this.#streams.get(frame.sid)?.destroy(); this.#streams.delete(frame.sid); }
    }

    async #onRequest(req: RpcRequest): Promise<void>{
        try{
            this.#send({ t: 'res', id: req.id, ok: true, result: await this.#dispatch(req) });
        }catch(error){
            this.#send({ t: 'res', id: req.id, ok: false, error: error instanceof Error ? error.message : 'agent error' });
        }
    }

    async #dispatch(req: RpcRequest): Promise<unknown>{
        const docker = this.#docker;
        const p = req.payload as Record<string, unknown>;

        switch(req.op){
            case 'docker.ensureNetwork': await docker.ensureNetwork(p.name as string); return {};
            case 'docker.ensureVolume': await docker.ensureVolume(p.name as string, p.labels as Record<string, string>); return {};
            case 'docker.imageExists': return { exists: await docker.imageExists(p.image as string) };
            case 'docker.pull': await docker.pull(p.image as string); return {};
            case 'docker.create': return { id: (await docker.create(p.spec as CreateContainerSpecWire)).id };
            case 'docker.list': return { ids: (await docker.list(p.labels as Record<string, string>)).map((h) => h.id) };
            case 'container.start': await docker.get(p.id as string).start(); return {};
            case 'container.stop': await docker.get(p.id as string).stop(); return {};
            case 'container.remove': await docker.get(p.id as string).remove(Boolean(p.withVolumes)); return {};
            case 'container.isRunning': return { running: await docker.get(p.id as string).isRunning() };
            case 'container.volumeAt': return { name: (await docker.get(p.id as string).volumeAt(p.destination as string)) ?? null };
            case 'container.exec': {
                const payload = req.payload as ExecPayload;
                return docker.get(payload.id).exec(payload.cmd, payload.opts);
            }
            case 'container.stats': return docker.get(p.id as string).stats();
            case 'pty.open': {
                const payload = req.payload as PtyOpenPayload;
                this.#bindPty(req.id, await docker.get(payload.id).openPty(payload.cmd, payload.opts));
                return {};
            }
            case 'tcp.open': {
                const payload = req.payload as TcpOpenPayload;
                this.#bindStream(req.id, await docker.connect(payload.id, payload.port));
                return {};
            }
            default: throw new Error(`unknown op ${(req as RpcRequest).op}`);
        }
    }

    #bindPty(sid: string, pty: PtyStream): void{
        this.#streams.set(sid, pty);
        pty.on('data', (chunk: Buffer) => this.#send({ t: 'sd', sid, b64: chunk.toString('base64') }));
        void pty.exitCode.then((code) => this.#send({ t: 'sx', sid, code })).catch(() => undefined);
        this.#bindClose(sid, pty);
    }

    #bindStream(sid: string, stream: Duplex): void{
        this.#streams.set(sid, stream);
        stream.on('data', (chunk: Buffer) => this.#send({ t: 'sd', sid, b64: chunk.toString('base64') }));
        this.#bindClose(sid, stream);
    }

    #bindClose(sid: string, stream: Duplex): void{
        const done = (): void => {
            if(!this.#streams.has(sid)) return;
            this.#streams.delete(sid);
            this.#send({ t: 'sc', sid });
        };
        stream.on('close', done);
        stream.on('end', done);
        stream.on('error', done);
    }
}
