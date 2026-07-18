import type ContainerHandle from '@/shared/services/docker/ContainerHandle';
import type { PtyStream } from '@/shared/services/docker/contracts';

/**
 * Each agent session runs as its own detached tmux session inside the project container.
 * The agent process is owned by tmux, not by the WebSocket — closing the browser detaches,
 * it never kills. Reconnecting re-attaches to the same tmux session. This is the mechanism
 * behind the 24/7 promise.
 */
export default class TmuxService{
    name(sessionId: number): string{
        return `cc-${sessionId}`;
    }

    async hasSession(handle: ContainerHandle, name: string): Promise<boolean>{
        const { exitCode } = await handle.exec(['tmux', 'has-session', '-t', name]);
        return exitCode === 0;
    }

    /** Creates the detached session running `cmd` with `env`, unless it already exists. */
    async ensureSession(
        handle: ContainerHandle,
        name: string,
        cmd: string[],
        env: string[],
        cwd: string
    ): Promise<void>{
        if(await this.hasSession(handle, name)) return;

        const envFlags = env.flatMap((entry) => ['-e', entry]);
        await handle.exec(['tmux', 'new-session', '-d', '-s', name, '-c', cwd, ...envFlags, ...cmd]);
    }

    async kill(handle: ContainerHandle, name: string): Promise<void>{
        await handle.exec(['tmux', 'kill-session', '-t', name]);
    }

    /** Types a line into the session's pane and submits it (used for scheduled prompts). */
    async sendKeys(handle: ContainerHandle, name: string, text: string): Promise<void>{
        await handle.exec(['tmux', 'send-keys', '-t', name, text, 'Enter']);
    }

    /** Opens a PTY attached to the tmux session — the stream the terminal gateway bridges. */
    attach(handle: ContainerHandle, name: string): Promise<PtyStream>{
        return handle.openPty(['tmux', 'attach-session', '-t', name]);
    }

    /** Plain-text snapshot of the current pane, replayed to a client on join. */
    async capture(handle: ContainerHandle, name: string): Promise<string>{
        const { output } = await handle.exec(['tmux', 'capture-pane', '-p', '-t', name]);
        return output;
    }
}
