import { eventBus } from '@/shared/events/EventBus';
import { logger } from '@/core/utils/Logger';
import { getAdapter } from '@/modules/clis/adapters/registry';
import Session from '../models/Session';
import type { SessionStatus } from '@cloud-code/contracts/modules/session/domain';
import type { TerminalFrame } from '@cloud-code/contracts/modules/session/terminal';

type Emit = (frame: TerminalFrame) => void;

interface Tracked{
    session: Session;
    emit: Emit;
    status: SessionStatus;
    idleTimer: ReturnType<typeof setTimeout> | null;
}

const IDLE_MS = 8000;

/**
 * Derives a session's live status from PTY output using the CLI adapter's heuristic, then
 * persists it, broadcasts a terminal.status frame, and emits domain events that notifications
 * (phase 22) and the fleet dashboard (phase 23) consume. Best-effort: if the heuristic never
 * matches, the terminal still works — only the badge is less precise.
 */
export default class SessionStatusService{
    readonly #tracked = new Map<number, Tracked>();

    track(session: Session, emit: Emit): void{
        this.#tracked.set(session.id, { session, emit, status: session.status, idleTimer: null });
    }

    untrack(sessionId: number): void{
        const tracked = this.#tracked.get(sessionId);
        if(tracked?.idleTimer) clearTimeout(tracked.idleTimer);
        this.#tracked.delete(sessionId);
    }

    feed(sessionId: number, chunk: string): void{
        const tracked = this.#tracked.get(sessionId);
        if(!tracked) return;

        const detected = getAdapter(tracked.session.cliType).detectStatus(chunk);
        if(detected && detected !== tracked.status){
            void this.#transition(tracked, detected);
        }
        this.#bumpIdle(tracked);
    }

    #bumpIdle(tracked: Tracked): void{
        if(tracked.idleTimer) clearTimeout(tracked.idleTimer);
        // Only running sessions decay to idle; a waiting_input session stays until answered.
        if(tracked.status !== 'running') return;
        tracked.idleTimer = setTimeout(() => void this.#transition(tracked, 'idle'), IDLE_MS);
    }

    async #transition(tracked: Tracked, status: SessionStatus): Promise<void>{
        if(tracked.status === status) return;
        tracked.status = status;

        tracked.emit({ type: 'terminal.status', data: { status } });

        try{
            tracked.session.status = status;
            tracked.session.lastActiveAt = new Date();
            await tracked.session.save();
        }catch(error){
            logger.error('session status persist failed', error, { scope: 'session.status', sessionId: tracked.session.id });
        }

        const base = { sessionId: tracked.session.id, ownerId: tracked.session.ownerId };
        eventBus.emit('session.status_changed', { ...base, status });
        if(status === 'waiting_input') eventBus.emit('session.needs_input', { ...base, title: tracked.session.title });
        if(status === 'idle') eventBus.emit('session.idle', { ...base, title: tracked.session.title });
    }
}
