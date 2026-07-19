import { logger } from '@/core/utils/Logger';
import { AgentError } from '../contracts/domain/errors';
import { AgentStream } from './AgentStream';
import type { GatewaySocket } from '@/shared/contracts/gateway';
import type { AgentOp, AgentToControl } from '@cloud-code/contracts/modules/agent/protocol';

interface Pending{
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
}

/**
 * The control-plane end of one agent's tunnel. Correlates RPC requests with responses and drives
 * the live streams (PTY, codespace TCP) multiplexed over the single WebSocket. One per connected
 * agent; disposed when the socket closes.
 */
export default class AgentConnection{
    #socket: GatewaySocket;
    #pending = new Map<string, Pending>();
    #streams = new Map<string, AgentStream>();
    #seq = 0;
    #alive = true;

    constructor(socket: GatewaySocket){
        this.#socket = socket;
    }

    #nextId(): string{
        this.#seq += 1;
        return `q${this.#seq}`;
    }

    /** Fire an RPC and await its result. */
    request<T = unknown>(op: AgentOp, payload: unknown): Promise<T>{
        if(!this.#alive) return Promise.reject(AgentError.NoAgentConnected());
        const id = this.#nextId();
        const promise = new Promise<T>((resolve, reject) => {
            this.#pending.set(id, { resolve: resolve as (r: unknown) => void, reject });
        });
        this.#send({ t: 'req', id, op, payload });
        return promise;
    }

    /** Open a stream (pty.open / tcp.open). The stream is returned immediately; its `whenReady`
     *  resolves when the agent acknowledges, or rejects if the open fails. */
    openStream(op: AgentOp, payload: unknown): AgentStream{
        const id = this.#nextId();
        const stream = new AgentStream(id, {
            sendData: (sid, chunk) => this.#send({ t: 'sd', sid, b64: chunk.toString('base64') }),
            sendResize: (sid, cols, rows) => this.#send({ t: 'sr', sid, cols, rows }),
            closeStream: (sid) => { this.#streams.delete(sid); this.#send({ t: 'sc', sid }); }
        });
        this.#streams.set(id, stream);
        this.#pending.set(id, {
            resolve: () => stream.markReady(),
            reject: (error) => { this.#streams.delete(id); stream.fail(error); }
        });
        this.#send({ t: 'req', id, op, payload });
        return stream;
    }

    /** Feed a raw frame received from the agent. */
    ingest(raw: string): void{
        let frame: AgentToControl;
        try{
            frame = JSON.parse(raw) as AgentToControl;
        }catch{
            return;
        }

        if(frame.t === 'res'){
            const pending = this.#pending.get(frame.id);
            if(!pending) return;
            this.#pending.delete(frame.id);
            if(frame.ok) pending.resolve(frame.result);
            else pending.reject(new Error(frame.error ?? 'agent error'));
            return;
        }
        if(frame.t === 'sd'){ this.#streams.get(frame.sid)?.pushData(Buffer.from(frame.b64, 'base64')); return; }
        if(frame.t === 'sx'){ this.#streams.get(frame.sid)?.setExit(frame.code); return; }
        if(frame.t === 'sc'){
            const stream = this.#streams.get(frame.sid);
            if(stream){ this.#streams.delete(frame.sid); stream.remoteClose(); }
        }
    }

    dispose(): void{
        this.#alive = false;
        for(const pending of this.#pending.values()) pending.reject(AgentError.NoAgentConnected());
        this.#pending.clear();
        for(const stream of this.#streams.values()) stream.destroy(new Error('agent disconnected'));
        this.#streams.clear();
    }

    #send(frame: object): void{
        if(!this.#alive) return;
        try{
            this.#socket.send(JSON.stringify(frame));
        }catch(error){
            logger.error('agent frame send failed', error, { scope: 'agent.tunnel' });
        }
    }
}
