import { logger } from '@/core/utils/Logger';
import SandboxService from '@/modules/sandboxes/services/SandboxService';
import CredentialService from '@/modules/credentials/services/CredentialService';
import { getAdapter } from '@/modules/clis/adapters/registry';
import type ContainerHandle from '@/shared/services/docker/ContainerHandle';
import type { PtyStream } from '@/shared/services/docker/contracts';
import Session from '../models/Session';
import TmuxService from './TmuxService';

/**
 * Brings a session to life: ensures its sandbox is running, resolves the owner's
 * credentials for the chosen CLI, installs the CLI if needed, and launches it inside a
 * persistent tmux session. Idempotent — calling start on an already-running session just
 * re-attaches.
 */
export default class SessionRuntimeService{
    #sandboxes = new SandboxService();
    #credentials = new CredentialService();
    #tmux = new TmuxService();

    async start(session: Session): Promise<Session>{
        const adapter = getAdapter(session.cliType);
        const { handle } = await this.#sandboxes.ensureRunning(session.ownerId, session.projectId);
        const name = this.#tmux.name(session.id);

        if(!(await this.#tmux.hasSession(handle, name))){
            // Inject every credential the owner has, not just the adapter's required keys, so
            // custom entries like ANTHROPIC_BASE_URL / OPENAI_BASE_URL reach the CLI too.
            const env = await this.#credentials.resolveEnvFor(session.ownerId);
            await this.#install(handle, adapter.installCommand());
            await this.#tmux.ensureSession(handle, name, adapter.startCommand({ cwd: session.cwd }), env, session.cwd);
        }

        session.containerId = handle.id;
        session.tmuxWindow = name;
        session.status = 'running';
        session.lastActiveAt = new Date();
        return session.save() as Promise<Session>;
    }

    /** Ensures the CLI is running, then returns a PTY attached to its tmux session. */
    async attach(session: Session): Promise<PtyStream>{
        const running = await this.start(session);
        const container = await this.#container(running);
        return this.#tmux.attach(container, this.#tmux.name(running.id));
    }

    async snapshot(session: Session): Promise<string>{
        const container = await this.#container(session);
        return this.#tmux.capture(container, this.#tmux.name(session.id));
    }

    async stop(session: Session): Promise<void>{
        try{
            const container = await this.#container(session);
            await this.#tmux.kill(container, this.#tmux.name(session.id));
        }catch(error){
            logger.error('session tmux kill failed', error, { scope: 'session.stop', sessionId: session.id });
        }
        session.status = 'stopped';
        await session.save();
    }

    async #container(session: Session): Promise<ContainerHandle>{
        const { handle } = await this.#sandboxes.ensureRunning(session.ownerId, session.projectId);
        return handle;
    }

    async #install(handle: ContainerHandle, cmd: string[]): Promise<void>{
        try{
            await handle.exec(cmd);
        }catch(error){
            logger.error('cli install failed', error, { scope: 'session.install' });
        }
    }
}
