import { Duplex } from 'node:stream';
import type { PtyStream } from '@/shared/services/docker/contracts';

interface StreamHost{
    sendData(sid: string, chunk: Buffer): void;
    sendResize(sid: string, cols: number, rows: number): void;
    closeStream(sid: string): void;
}

/**
 * A Duplex bound to one tunnel stream id. Writes are relayed to the agent as data frames (buffered
 * until the agent acknowledges the open), agent data is pushed to readers, and the shape satisfies
 * PtyStream (resize + exitCode) so it drops straight into the terminal bridge and codespace proxy.
 */
export class AgentStream extends Duplex implements PtyStream{
    readonly sid: string;
    readonly whenReady: Promise<void>;
    exitCode: Promise<number | null>;

    #host: StreamHost;
    #ready = false;
    #outbox: Buffer[] = [];
    #resolveReady!: () => void;
    #rejectReady!: (error: Error) => void;
    #resolveExit!: (code: number | null) => void;

    constructor(sid: string, host: StreamHost){
        super();
        this.sid = sid;
        this.#host = host;
        this.whenReady = new Promise<void>((resolve, reject) => {
            this.#resolveReady = resolve;
            this.#rejectReady = reject;
        });
        this.exitCode = new Promise<number | null>((resolve) => { this.#resolveExit = resolve; });
    }

    /** Agent accepted the open — flush anything written while we waited. */
    markReady(): void{
        if(this.#ready) return;
        this.#ready = true;
        for(const chunk of this.#outbox) this.#host.sendData(this.sid, chunk);
        this.#outbox = [];
        this.#resolveReady();
        // http/ws clients treat this as a socket and wait for 'connect' before writing.
        this.emit('connect');
    }

    // net.Socket shims so this Duplex can back an http.request / ws upstream connection.
    setNoDelay(): this{ return this; }
    setKeepAlive(): this{ return this; }
    setTimeout(): this{ return this; }
    ref(): this{ return this; }
    unref(): this{ return this; }

    fail(error: Error): void{
        this.#rejectReady(error);
        this.destroy(error);
    }

    resize(cols: number, rows: number): void{
        this.#host.sendResize(this.sid, cols, rows);
    }

    pushData(chunk: Buffer): void{
        this.push(chunk);
    }

    setExit(code: number | null): void{
        this.#resolveExit(code);
    }

    /** Agent closed its end → deliver EOF to readers. */
    remoteClose(): void{
        this.push(null);
    }

    _read(): void{
        // push-driven by pushData
    }

    _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void{
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        if(this.#ready) this.#host.sendData(this.sid, buffer);
        else this.#outbox.push(buffer);
        callback();
    }

    _destroy(error: Error | null, callback: (error: Error | null) => void): void{
        this.#host.closeStream(this.sid);
        this.#resolveExit(null);
        callback(error);
    }
}
