import { logger } from '@/core/utils/Logger';
import SessionRuntimeService from './SessionRuntimeService';
import SessionStatusService from './SessionStatusService';
import SessionEvent from '../models/SessionEvent';
import type Session from '../models/Session';
import type { PtyStream } from '@/shared/services/docker/contracts';
import type { TerminalFrame } from '@cloud-code/contracts/modules/session/terminal';

type FrameListener = (frame: TerminalFrame) => void;

interface Attachment{
    pty: PtyStream;
    listeners: Set<FrameListener>;
    buffer: string;
    flushTimer: ReturnType<typeof setTimeout> | null;
}

const FLUSH_MS = 1000;
const FLUSH_BYTES = 8192;

/**
 * Owns one PTY attach per session, shared across every socket in the session room. Closing
 * the last browser does NOT detach — the agent keeps running in tmux and its output keeps
 * being persisted, so a later reconnect can replay it. Output is coalesced before hitting
 * the DB to survive noisy spinners/progress bars.
 */
export default class TerminalBridge{
    #runtime = new SessionRuntimeService();
    #status = new SessionStatusService();
    readonly #attachments = new Map<number, Attachment>();

    constructor(runtime: SessionRuntimeService = new SessionRuntimeService()){
        this.#runtime = runtime;
    }

    snapshot(session: Session): Promise<string>{
        return this.#runtime.snapshot(session);
    }

    async subscribe(session: Session, listener: FrameListener): Promise<void>{
        let attachment = this.#attachments.get(session.id);
        if(!attachment){
            const pty = await this.#runtime.attach(session);
            attachment = { pty, listeners: new Set(), buffer: '', flushTimer: null };
            this.#attachments.set(session.id, attachment);

            pty.on('data', (chunk: Buffer) => this.#onData(session, attachment as Attachment, chunk.toString('utf8')));
            pty.on('close', () => this.#onClose(session));
            // Status frames are broadcast through the same listener set as output.
            this.#status.track(session, (frame) => attachment!.listeners.forEach((fn) => fn(frame)));
        }
        attachment.listeners.add(listener);
    }

    unsubscribe(sessionId: number, listener: FrameListener): void{
        this.#attachments.get(sessionId)?.listeners.delete(listener);
        // Intentionally keep the PTY attached: the agent runs 24/7 with no viewer.
    }

    write(sessionId: number, data: string): void{
        this.#attachments.get(sessionId)?.pty.write(data);
    }

    resize(sessionId: number, cols: number, rows: number): void{
        this.#attachments.get(sessionId)?.pty.resize(cols, rows);
    }

    /** Fully detaches and forgets a session (used on stop/remove). */
    release(sessionId: number): void{
        const attachment = this.#attachments.get(sessionId);
        if(!attachment) return;
        if(attachment.flushTimer) clearTimeout(attachment.flushTimer);
        try{
            attachment.pty.end();
        }catch{
            // stream already closed
        }
        this.#releaseStatus(sessionId);
        this.#attachments.delete(sessionId);
    }

    #onData(session: Session, attachment: Attachment, chunk: string): void{
        const frame: TerminalFrame = { type: 'terminal.output', data: { chunk } };
        attachment.listeners.forEach((listener) => listener(frame));
        this.#status.feed(session.id, chunk);
        this.#queuePersist(session, attachment, chunk);
    }

    #onClose(session: Session): void{
        const attachment = this.#attachments.get(session.id);
        const frame: TerminalFrame = { type: 'terminal.exit', data: { code: null } };
        attachment?.listeners.forEach((listener) => listener(frame));
        this.release(session.id);
    }

    #queuePersist(session: Session, attachment: Attachment, chunk: string): void{
        attachment.buffer += chunk;
        if(attachment.buffer.length >= FLUSH_BYTES){
            void this.#flush(session, attachment);
            return;
        }
        attachment.flushTimer ??= setTimeout(() => void this.#flush(session, attachment), FLUSH_MS);
    }

    async #flush(session: Session, attachment: Attachment): Promise<void>{
        if(attachment.flushTimer){
            clearTimeout(attachment.flushTimer);
            attachment.flushTimer = null;
        }
        const data = attachment.buffer;
        attachment.buffer = '';
        if(!data) return;

        try{
            await SessionEvent.create({ sessionId: session.id, kind: 'output', data }).save();
        }catch(error){
            logger.error('session transcript persist failed', error, { scope: 'session.transcript', sessionId: session.id });
        }
    }

    #releaseStatus(sessionId: number): void{
        this.#status.untrack(sessionId);
    }
}
