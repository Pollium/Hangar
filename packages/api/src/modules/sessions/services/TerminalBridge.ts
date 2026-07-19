import { StringDecoder } from 'node:string_decoder';
import { logger } from '@/core/utils/Logger';
import { eventBus } from '@/shared/events/EventBus';
import SessionRuntimeService from './SessionRuntimeService';
import SessionStatusService from './SessionStatusService';
import Session from '../models/Session';
import SessionEvent from '../models/SessionEvent';
import { SessionError } from '../contracts/domain/errors';
import type { PtyStream } from '@/shared/services/docker/contracts';
import type { TerminalDimensions, TerminalFrame } from '@hangar/contracts/modules/session/terminal';

type FrameListener = (frame: TerminalFrame) => void;
export type TerminalReleaseReason = 'stopped' | 'removed' | 'restarted' | 'exit';
type ReleaseListener = (sessionId: number, reason: TerminalReleaseReason) => void;

interface Attachment{
    session: Session;
    pty: PtyStream;
    listeners: Set<FrameListener>;
    decoder: StringDecoder;
    buffer: string;
    flushTimer: ReturnType<typeof setTimeout> | null;
    resizeTarget?: TerminalDimensions;
    resizeFlight: Promise<void> | null;
    closing: boolean;
    generation: number;
}

type ErrorResult = 'transitioned' | 'already-error' | 'contended' | 'superseded';

const ACTIVE_STATUSES = ['starting', 'running', 'waiting_input', 'idle'];
const FLUSH_MS = 1000;
const FLUSH_BYTES = 8192;

/**
 * Owns one PTY attach per session, shared across every socket in the session room. Closing
 * the last browser does NOT detach — the agent keeps running in tmux and its output keeps
 * being persisted, so a later reconnect can replay it. Output is coalesced before hitting
 * the DB to survive noisy spinners/progress bars.
 */
export default class TerminalBridge{
    #runtime: SessionRuntimeService;
    #status = new SessionStatusService();
    readonly #attachments = new Map<number, Attachment>();
    readonly #attachmentFlights = new Map<number, Promise<Attachment>>();
    readonly #closingFlights = new Map<number, Set<Promise<void>>>();
    readonly #generations = new Map<number, number>();
    readonly #pendingGenerations = new Map<number, number>();
    readonly #releaseListeners = new Set<ReleaseListener>();

    constructor(runtime: SessionRuntimeService = new SessionRuntimeService()){
        this.#runtime = runtime;
    }

    onRelease(listener: ReleaseListener): () => void{
        this.#releaseListeners.add(listener);
        return () => { this.#releaseListeners.delete(listener); };
    }

    snapshot(session: Session, dimensions?: TerminalDimensions): Promise<string>{
        // Reserve one generation for the entire snapshot→attach operation. Concurrent joins
        // and snapshots reuse it instead of invalidating the attachment still being opened.
        if(!this.#attachments.has(session.id)
            && !this.#attachmentFlights.has(session.id)
            && !this.#pendingGenerations.has(session.id)){
            this.#pendingGenerations.set(session.id, this.#nextGeneration(session.id));
        }
        return this.#runtime.snapshot(session, dimensions);
    }

    async subscribe(
        session: Session,
        listener: FrameListener,
        dimensions?: TerminalDimensions
    ): Promise<void>{
        let attachment = this.#attachments.get(session.id);
        if(!attachment || attachment.closing){
            attachment = await this.#ensureAttachment(session, dimensions);
        }
        attachment.listeners.add(listener);
    }

    unsubscribe(sessionId: number, listener: FrameListener): void{
        this.#attachments.get(sessionId)?.listeners.delete(listener);
        // Intentionally keep the PTY attached: the agent runs 24/7 with no viewer.
    }

    write(sessionId: number, data: string): boolean{
        const attachment = this.#attachments.get(sessionId);
        if(!attachment || attachment.closing) return false;
        attachment.pty.write(data);
        return true;
    }

    resize(sessionId: number, cols: number, rows: number): void{
        const attachment = this.#attachments.get(sessionId);
        if(!attachment || attachment.closing) return;

        const dimensions = { cols, rows };
        attachment.pty.resize(cols, rows);
        attachment.resizeTarget = dimensions;
        this.#scheduleResize(attachment);
    }

    /** Fully detaches, flushes, and forgets a session (used on stop/remove). */
    async release(
        sessionId: number,
        reason: Exclude<TerminalReleaseReason, 'exit'> = 'stopped'
    ): Promise<void>{
        this.#pendingGenerations.delete(sessionId);
        this.#nextGeneration(sessionId);

        const attachment = this.#attachments.get(sessionId);
        if(attachment){
            const tail = attachment.decoder.end();
            if(tail) this.#onDecodedData(attachment.session, attachment, tail);
        }
        this.#notifyRelease(sessionId, reason);

        if(attachment){
            attachment.resizeTarget = undefined;
            attachment.closing = true;
            this.#attachments.delete(sessionId);
            this.#releaseStatus(sessionId);
            const flushing = this.#flush(attachment.session, attachment);
            try{
                attachment.pty.end();
            }catch{
                // stream already closed
            }
            await flushing;
        }

        const closing = [...(this.#closingFlights.get(sessionId) ?? [])];
        if(closing.length > 0) await Promise.all(closing);
    }

    async #ensureAttachment(session: Session, dimensions?: TerminalDimensions): Promise<Attachment>{
        const existing = this.#attachments.get(session.id);
        if(existing && !existing.closing) return existing;

        const active = this.#attachmentFlights.get(session.id);
        if(active) return active;

        const generation = this.#pendingGenerations.get(session.id) ?? this.#nextGeneration(session.id);
        this.#pendingGenerations.set(session.id, generation);
        const task = (async () => {
            const pty = await this.#runtime.attach(session, dimensions);
            if(dimensions) pty.resize(dimensions.cols, dimensions.rows);
            if(this.#generations.get(session.id) !== generation){
                try{ pty.end(); }catch{ /* already closed */ }
                throw SessionError.NotRunning();
            }

            const attachment: Attachment = {
                session,
                pty,
                listeners: new Set(),
                decoder: new StringDecoder('utf8'),
                buffer: '',
                flushTimer: null,
                resizeFlight: null,
                closing: false,
                generation
            };
            this.#attachments.set(session.id, attachment);
            pty.on('data', (chunk: Buffer) => this.#onBuffer(session, attachment, chunk));
            pty.on('close', () => this.#beginClose(session, attachment));
            this.#status.track(session, (frame) => attachment.listeners.forEach((fn) => fn(frame)));
            if(pty.destroyed || pty.closed) this.#beginClose(session, attachment);
            return attachment;
        })();

        this.#attachmentFlights.set(session.id, task);
        try{
            return await task;
        }finally{
            if(this.#attachmentFlights.get(session.id) === task) this.#attachmentFlights.delete(session.id);
            if(this.#pendingGenerations.get(session.id) === generation) this.#pendingGenerations.delete(session.id);
        }
    }

    #onBuffer(session: Session, attachment: Attachment, chunk: Buffer): void{
        if(attachment.closing) return;
        const decoded = attachment.decoder.write(chunk);
        if(decoded) this.#onDecodedData(session, attachment, decoded);
    }

    #onDecodedData(session: Session, attachment: Attachment, chunk: string): void{
        if(attachment.closing) return;
        const frame: TerminalFrame = { type: 'terminal.output', data: { chunk } };
        attachment.listeners.forEach((listener) => listener(frame));
        this.#status.feed(session.id, chunk);
        this.#queuePersist(session, attachment, chunk);
    }

    #beginClose(session: Session, attachment: Attachment): void{
        const flights = this.#closingFlights.get(session.id) ?? new Set<Promise<void>>();
        const task = this.#onClose(session, attachment);
        flights.add(task);
        this.#closingFlights.set(session.id, flights);
        void task.finally(() => {
            flights.delete(task);
            if(flights.size === 0 && this.#closingFlights.get(session.id) === flights){
                this.#closingFlights.delete(session.id);
            }
        });
    }

    async #onClose(session: Session, attachment: Attachment): Promise<void>{
        if(attachment.closing || this.#attachments.get(session.id) !== attachment) return;
        const tail = attachment.decoder.end();
        if(tail) this.#onDecodedData(session, attachment, tail);
        attachment.resizeTarget = undefined;
        attachment.closing = true;
        // Remove synchronously: Retry must never reuse this dead stream while inspect/flush wait.
        this.#attachments.delete(session.id);
        this.#releaseStatus(session.id);

        const code = await attachment.pty.exitCode.catch(() => null);
        await this.#flush(session, attachment);
        if(this.#generations.get(session.id) !== attachment.generation) return;

        let result: ErrorResult | 'persistence-failed';
        try{
            result = await this.#markError(session.id, attachment.generation);
        }catch(error){
            logger.error('session exit status persist failed', error, { scope: 'session.exit', sessionId: session.id });
            result = 'persistence-failed';
        }
        if(result === 'superseded' || this.#generations.get(session.id) !== attachment.generation) return;

        session.status = 'error';
        session.lastActiveAt = new Date();
        const statusFrame: TerminalFrame = { type: 'terminal.status', data: { status: 'error' } };
        const exitFrame: TerminalFrame = { type: 'terminal.exit', data: { code } };
        attachment.listeners.forEach((listener) => {
            listener(statusFrame);
            listener(exitFrame);
        });
        this.#notifyRelease(session.id, 'exit');
        if(result === 'transitioned'){
            eventBus.emit('session.status_changed', {
                sessionId: session.id,
                ownerId: session.ownerId,
                projectId: session.projectId,
                status: 'error'
            });
        }
    }

    async #markError(sessionId: number, generation: number): Promise<ErrorResult>{
        // Retry once when a concurrent status detector changed lastActiveAt. Stop/remove/retry
        // invalidate the generation or move the row out of ACTIVE_STATUSES, so they still win.
        for(let attempt = 0; attempt < 2; attempt += 1){
            if(this.#generations.get(sessionId) !== generation) return 'superseded';
            const current = await Session.findOneBy({ id: sessionId });
            if(!current || this.#generations.get(sessionId) !== generation) return 'superseded';
            if(current.status === 'error') return 'already-error';
            if(!ACTIVE_STATUSES.includes(current.status)) return 'superseded';

            const query = Session.createQueryBuilder()
                .update(Session)
                .set({ status: 'error', lastActiveAt: new Date() })
                .where('id = :id', { id: sessionId })
                .andWhere('status = :status', { status: current.status });
            if(current.lastActiveAt){
                query.andWhere('lastActiveAt = :expectedActivity', { expectedActivity: current.lastActiveAt });
            }else{
                query.andWhere('lastActiveAt IS NULL');
            }
            const updated = await query.execute();
            if(updated.affected) return 'transitioned';
        }
        return 'contended';
    }

    #scheduleResize(attachment: Attachment): void{
        if(attachment.resizeFlight || !attachment.resizeTarget || attachment.closing) return;

        const task = (async () => {
            while(
                attachment.resizeTarget
                && !attachment.closing
                && this.#attachments.get(attachment.session.id) === attachment
            ){
                const dimensions = attachment.resizeTarget;
                attachment.resizeTarget = undefined;
                await this.#runtime.resize(attachment.session, dimensions);
            }
        })();
        attachment.resizeFlight = task;
        void task.catch((error) => {
            logger.error('terminal tmux resize failed', error, {
                scope: 'terminal.resize',
                sessionId: attachment.session.id
            });
        }).finally(() => {
            if(attachment.resizeFlight === task) attachment.resizeFlight = null;
            if(attachment.resizeTarget) this.#scheduleResize(attachment);
        });
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

    #nextGeneration(sessionId: number): number{
        const next = (this.#generations.get(sessionId) ?? 0) + 1;
        this.#generations.set(sessionId, next);
        return next;
    }

    #notifyRelease(sessionId: number, reason: TerminalReleaseReason): void{
        this.#releaseListeners.forEach((listener) => listener(sessionId, reason));
    }

    #releaseStatus(sessionId: number): void{
        this.#status.untrack(sessionId);
    }
}

// The gateway and HTTP lifecycle service must invalidate the exact same attachments.
export const terminalBridge = new TerminalBridge();
