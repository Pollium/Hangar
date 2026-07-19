import { logger } from '@/core/utils/Logger';
import { eventBus } from '@/shared/events/EventBus';
import { DockerError } from '@/shared/errors/DockerError';
import RuntimeError from '@/shared/errors/RuntimeError';
import SandboxService from '@/modules/sandboxes/services/SandboxService';
import CredentialService from '@/modules/credentials/services/CredentialService';
import { getAdapter } from '@/modules/clis/adapters/registry';
import type { IContainerHandle, PtyStream } from '@/shared/services/docker/contracts';
import type { TerminalDimensions } from '@hangar/contracts/modules/session/terminal';
import Session from '../models/Session';
import { SessionError } from '../contracts/domain/errors';
import TmuxService from './TmuxService';

// Every service instance shares this queue. Lifecycle operations for one session are ordered,
// while unrelated sessions still start and stop concurrently.
const operationTails = new Map<number, Promise<void>>();

const withSessionLock = async <T>(sessionId: number, operation: () => Promise<T>): Promise<T> => {
    const previous = operationTails.get(sessionId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.catch(() => undefined).then(() => gate);
    operationTails.set(sessionId, tail);

    await previous.catch(() => undefined);
    try{
        return await operation();
    }finally{
        release();
        if(operationTails.get(sessionId) === tail) operationTails.delete(sessionId);
    }
};

const RESTARTABLE_STATUSES = new Set(['starting', 'error', 'stopped']);

/**
 * Owns the tmux lifecycle for a session. All operations are serialized by session id so a
 * late start cannot overwrite stop/remove, and reconnecting to a healthy tmux does not
 * falsify status or activity timestamps.
 */
export default class SessionRuntimeService{
    #sandboxes: SandboxService;
    #credentials: CredentialService;
    #tmux: TmuxService;

    constructor(
        sandboxes: SandboxService = new SandboxService(),
        credentials: CredentialService = new CredentialService(),
        tmux: TmuxService = new TmuxService()
    ){
        this.#sandboxes = sandboxes;
        this.#credentials = credentials;
        this.#tmux = tmux;
    }

    start(session: Session): Promise<Session>{
        return withSessionLock(session.id, () => this.#startUnlocked(session));
    }

    /** Ensures the CLI is running, sizes tmux, then returns its attached PTY. */
    attach(session: Session, dimensions?: TerminalDimensions): Promise<PtyStream>{
        return withSessionLock(session.id, async () => {
            const running = await this.#startUnlocked(session, dimensions);
            const container = await this.#container(running);
            const name = this.#tmux.name(running.id);
            if(dimensions) await this.#tmux.resizeWindow(container, name, dimensions);
            return this.#tmux.attach(container, name);
        });
    }

    /** Resizes an already-attached tmux window without changing session lifecycle state. */
    resize(session: Session, dimensions: TerminalDimensions): Promise<void>{
        return withSessionLock(session.id, async () => {
            const current = await this.#current(session.id);
            if(current.status === 'stopped') throw SessionError.NotRunning();
            const container = await this.#container(current);
            await this.#tmux.resizeWindow(
                container,
                current.tmuxWindow ?? this.#tmux.name(current.id),
                dimensions
            );
        });
    }

    snapshot(session: Session, dimensions?: TerminalDimensions): Promise<string>{
        return withSessionLock(session.id, async () => {
            const running = await this.#startUnlocked(session, dimensions);
            const container = await this.#container(running);
            const name = this.#tmux.name(running.id);
            if(dimensions) await this.#tmux.resizeWindow(container, name, dimensions);
            return this.#tmux.capture(container, name);
        });
    }

    /** Releases the terminal attachment, kills the tmux/PTY, swaps the adapter, then relaunches
     * inside the same lock. Releasing before the kill deterministically invalidates the old
     * attachment before the kill can trigger its own PTY close — otherwise that natural close
     * races the release and can deliver a stale exit frame after the client has already
     * rejoined and started rendering the new CLI's output. */
    switchCli(
        session: Session,
        cliType: string,
        onTerminated?: () => void | Promise<void>
    ): Promise<Session>{
        return withSessionLock(session.id, async () => {
            const current = await this.#current(session.id);
            if(current.cliType === cliType) return current;

            await this.#afterTermination(onTerminated, current.id);
            await this.#kill(current);
            current.cliType = cliType;
            current.status = 'stopped';
            current.tmuxWindow = null;
            current.lastActiveAt = new Date();
            const saved = await current.save() as Session;
            this.#sync(session, saved);
            eventBus.emit('session.status_changed', {
                sessionId: saved.id,
                ownerId: saved.ownerId,
                projectId: saved.projectId,
                status: 'stopped'
            });

            return this.#startUnlocked(saved);
        });
    }

    stop(session: Session, onTerminated?: () => void | Promise<void>): Promise<Session>{
        return withSessionLock(session.id, async () => {
            const current = await this.#current(session.id);
            await this.#kill(current);
            await this.#afterTermination(onTerminated, current.id);
            current.status = 'stopped';
            current.lastActiveAt = new Date();
            const saved = await current.save() as Session;
            this.#sync(session, saved);
            eventBus.emit('session.status_changed', {
                sessionId: saved.id,
                ownerId: saved.ownerId,
                projectId: saved.projectId,
                status: 'stopped'
            });
            return saved;
        });
    }

    remove(session: Session, onTerminated?: () => void | Promise<void>): Promise<void>{
        return withSessionLock(session.id, async () => {
            const current = await this.#current(session.id);
            await this.#kill(current);
            await this.#afterTermination(onTerminated, current.id);
            const ownerId = current.ownerId;
            const projectId = current.projectId;
            await current.remove();
            eventBus.emit('session.removed', { sessionId: session.id, ownerId, projectId });
        });
    }

    async #startUnlocked(session: Session, dimensions?: TerminalDimensions): Promise<Session>{
        const current = await this.#current(session.id);
        // A join fetched before stop must not restart the process after stop wins the lock.
        // A fresh join of an already-stopped row is the explicit restart path.
        if(current.status === 'stopped' && session.status !== 'stopped') throw SessionError.NotRunning();

        try{
            const adapter = getAdapter(current.cliType);
            const { handle } = await this.#sandboxes.ensureRunning(current.ownerId, current.projectId);
            const name = this.#tmux.name(current.id);
            const existed = await this.#tmux.hasSession(handle, name);

            if(!existed){
                // Inject every variable the owner has so custom endpoint/config entries reach
                // the CLI together with provider keys.
                const env = await this.#credentials.resolveEnvFor(current.ownerId);
                await this.#install(handle, adapter.installCommand());
                await this.#tmux.ensureSession(
                    handle,
                    name,
                    adapter.startCommand({ cwd: current.cwd }),
                    env,
                    current.cwd,
                    dimensions
                );
            }

            const transitionToRunning = !existed || RESTARTABLE_STATUSES.has(current.status);
            const metadataChanged = current.containerId !== handle.id || current.tmuxWindow !== name;
            current.containerId = handle.id;
            current.tmuxWindow = name;
            if(transitionToRunning){
                current.status = 'running';
                current.lastActiveAt = new Date();
            }

            const saved = metadataChanged || transitionToRunning
                ? await current.save() as Session
                : current;
            this.#sync(session, saved);

            if(transitionToRunning){
                eventBus.emit('session.status_changed', {
                    sessionId: saved.id,
                    ownerId: saved.ownerId,
                    projectId: saved.projectId,
                    status: 'running'
                });
            }
            return saved;
        }catch(error){
            logger.error('session runtime start failed', error, { scope: 'session.start', sessionId: session.id });
            const persisted = await Session.findOneBy({ id: session.id });
            if(persisted && persisted.status !== 'stopped'){
                persisted.status = 'error';
                persisted.lastActiveAt = new Date();
                try{
                    const saved = await persisted.save() as Session;
                    this.#sync(session, saved);
                    eventBus.emit('session.status_changed', {
                        sessionId: saved.id,
                        ownerId: saved.ownerId,
                        projectId: saved.projectId,
                        status: 'error'
                    });
                }catch(persistError){
                    logger.error('session error status persist failed', persistError, {
                        scope: 'session.start',
                        sessionId: session.id
                    });
                }
            }
            throw error;
        }
    }

    async #kill(session: Session): Promise<void>{
        const name = session.tmuxWindow ?? this.#tmux.name(session.id);
        try{
            // Missing metadata can mean the session never started, or that launch created
            // tmux but failed before saving the row. Inspect an existing sandbox without
            // provisioning a new one merely to stop an untouched session.
            if(!session.containerId){
                try{
                    const sandbox = await this.#sandboxes.status(session.ownerId, session.projectId);
                    if(!sandbox.containerId) return;
                }catch(error){
                    if(error instanceof RuntimeError && error.message.startsWith('Sandbox::NotFound')) return;
                    throw error;
                }
            }

            const { handle } = await this.#sandboxes.ensureRunning(session.ownerId, session.projectId);
            if(!(await this.#tmux.hasSession(handle, name))) return;
            await this.#tmux.kill(handle, name);
        }catch(error){
            logger.error('session tmux kill failed', error, { scope: 'session.stop', sessionId: session.id });
            throw error;
        }
    }

    async #current(sessionId: number): Promise<Session>{
        const current = await Session.findOneBy({ id: sessionId });
        if(!current) throw SessionError.NotFound();
        return current;
    }

    async #container(session: Session): Promise<IContainerHandle>{
        const { handle } = await this.#sandboxes.ensureRunning(session.ownerId, session.projectId);
        return handle;
    }

    async #install(handle: IContainerHandle, cmd: string[]): Promise<void>{
        const result = await handle.exec(cmd);
        if(result.exitCode !== 0) throw DockerError.ExecFailed('cli-install');
    }

    async #afterTermination(
        callback: (() => void | Promise<void>) | undefined,
        sessionId: number
    ): Promise<void>{
        if(!callback) return;
        try{
            await callback();
        }catch(error){
            logger.error('session termination callback failed', error, { scope: 'session.stop', sessionId });
        }
    }

    #sync(target: Session, source: Session): void{
        target.containerId = source.containerId;
        target.tmuxWindow = source.tmuxWindow;
        target.status = source.status;
        target.lastActiveAt = source.lastActiveAt;
        target.updatedAt = source.updatedAt;
    }
}
