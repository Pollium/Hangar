import { eventBus } from '@/shared/events/EventBus';
import { logger } from '@/core/utils/Logger';
import { getAdapter } from '@/modules/clis/adapters/registry';
import Session from '../models/Session';
import type { SessionStatus } from '@hangar/contracts/modules/session/domain';
import type { TerminalFrame } from '@hangar/contracts/modules/session/terminal';

type Emit = (frame: TerminalFrame) => void;

interface Tracked{
    session: Session;
    emit: Emit;
    status: SessionStatus;
    desiredStatus: SessionStatus;
    idleTimer: ReturnType<typeof setTimeout> | null;
    transitionTail: Promise<void>;
}

const IDLE_MS = 8000;
const ACTIVE_STATUSES: SessionStatus[] = ['starting', 'running', 'waiting_input', 'idle'];

/**
 * Derives a session's live status from PTY output. Transitions are serialized and persisted
 * with compare-and-set so a late detector can never overwrite stop, remove, or exit error.
 */
export default class SessionStatusService{
    readonly #tracked = new Map<number, Tracked>();

    track(session: Session, emit: Emit): void{
        this.#tracked.set(session.id, {
            session,
            emit,
            status: session.status,
            desiredStatus: session.status,
            idleTimer: null,
            transitionTail: Promise.resolve()
        });
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
        if(detected) this.#queueTransition(tracked, detected);
        this.#bumpIdle(tracked);
    }

    #bumpIdle(tracked: Tracked): void{
        if(tracked.idleTimer) clearTimeout(tracked.idleTimer);
        // Only running sessions decay to idle; a waiting_input session stays until answered.
        if(tracked.desiredStatus !== 'running') return;
        tracked.idleTimer = setTimeout(() => this.#queueTransition(tracked, 'idle'), IDLE_MS);
    }

    #queueTransition(tracked: Tracked, status: SessionStatus): void{
        if(tracked.desiredStatus === status) return;
        tracked.desiredStatus = status;
        tracked.transitionTail = tracked.transitionTail
            .then(() => this.#transitionWithRetry(tracked, status))
            .catch((error) => {
                if(tracked.desiredStatus === status) tracked.desiredStatus = tracked.status;
                logger.error('session status persist failed', error, {
                    scope: 'session.status',
                    sessionId: tracked.session.id
                });
            });
    }

    async #transitionWithRetry(tracked: Tracked, status: SessionStatus): Promise<void>{
        try{
            await this.#transition(tracked, status);
        }catch{
            await this.#transition(tracked, status);
        }
    }

    async #transition(tracked: Tracked, status: SessionStatus): Promise<void>{
        if(this.#tracked.get(tracked.session.id) !== tracked || tracked.status === status) return;
        const previous = tracked.status;
        if(!ACTIVE_STATUSES.includes(previous)) return;

        const activity = new Date();
        const query = Session.createQueryBuilder()
            .update(Session)
            .set({ status, lastActiveAt: activity })
            .where('id = :id', { id: tracked.session.id })
            .andWhere('status = :status', { status: previous });
        if(tracked.session.lastActiveAt){
            query.andWhere('lastActiveAt = :expectedActivity', { expectedActivity: tracked.session.lastActiveAt });
        }else{
            query.andWhere('lastActiveAt IS NULL');
        }
        const result = await query.execute();
        if(!result.affected){
            const current = await Session.findOneBy({ id: tracked.session.id });
            if(current){
                tracked.status = current.status;
                if(tracked.desiredStatus === status) tracked.desiredStatus = current.status;
                tracked.session.status = current.status;
                tracked.session.lastActiveAt = current.lastActiveAt;
            }
            return;
        }
        if(this.#tracked.get(tracked.session.id) !== tracked) return;

        tracked.status = status;
        tracked.session.status = status;
        tracked.session.lastActiveAt = activity;
        if(tracked.idleTimer && status !== 'running'){
            clearTimeout(tracked.idleTimer);
            tracked.idleTimer = null;
        }
        tracked.emit({ type: 'terminal.status', data: { status } });

        const base = {
            sessionId: tracked.session.id,
            ownerId: tracked.session.ownerId,
            projectId: tracked.session.projectId
        };
        eventBus.emit('session.status_changed', { ...base, status });
        if(status === 'waiting_input') eventBus.emit('session.needs_input', { ...base, title: tracked.session.title });
        if(status === 'idle') eventBus.emit('session.idle', { ...base, title: tracked.session.title });
    }
}
