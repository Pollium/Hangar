import { DockerError } from '@/shared/errors/DockerError';
import type { IContainerHandle, PtyStream } from '@/shared/services/docker/contracts';
import type { TerminalDimensions } from '@hangar/contracts/modules/session/terminal';

const ensureFlights = new Map<string, Promise<void>>();

/**
 * Each agent session runs as its own detached tmux session inside the project container.
 * The agent process is owned by tmux, not by the WebSocket — closing the browser detaches,
 * it never kills. Reconnecting re-attaches to the same tmux session. This is the mechanism
 * behind the 24/7 promise.
 */
export default class TmuxService{
    name(sessionId: number): string{
        return `hangar-${sessionId}`;
    }

    async hasSession(handle: IContainerHandle, name: string): Promise<boolean>{
        const { exitCode } = await handle.exec(['tmux', 'has-session', '-t', name]);
        if(exitCode === 0) return true;
        if(exitCode === 1) return false;
        throw DockerError.ExecFailed('tmux-has-session');
    }

    /** Creates the detached session running `cmd` with `env`, unless it already exists. */
    async ensureSession(
        handle: IContainerHandle,
        name: string,
        cmd: string[],
        env: string[],
        cwd: string,
        dimensions?: TerminalDimensions
    ): Promise<void>{
        const key = `${handle.id}:${name}`;
        const active = ensureFlights.get(key);
        if(active) return active;

        const task = (async () => {
            if(await this.hasSession(handle, name)) return;

            const envFlags = env.flatMap((entry) => ['-e', entry]);
            const sizeFlags = dimensions
                ? ['-x', String(dimensions.cols), '-y', String(dimensions.rows)]
                : [];
            const result = await handle.exec([
                'tmux', 'new-session', '-d', '-s', name, ...sizeFlags, '-c', cwd, ...envFlags, ...cmd
            ]);
            if(result.exitCode !== 0){
                // A second API process may have won after our has-session check.
                if(await this.hasSession(handle, name)) return;
                throw DockerError.ExecFailed('tmux-new-session');
            }
            if(!(await this.hasSession(handle, name))) throw DockerError.ExecFailed('tmux-session-exited');
        })();

        ensureFlights.set(key, task);
        try{
            await task;
        }finally{
            if(ensureFlights.get(key) === task) ensureFlights.delete(key);
        }
    }

    async resizeWindow(handle: IContainerHandle, name: string, dimensions: TerminalDimensions): Promise<void>{
        const result = await handle.exec([
            'tmux', 'resize-window', '-t', name,
            '-x', String(dimensions.cols), '-y', String(dimensions.rows)
        ]);
        if(result.exitCode !== 0) throw DockerError.ExecFailed('tmux-resize-window');
    }

    async kill(handle: IContainerHandle, name: string): Promise<void>{
        const result = await handle.exec(['tmux', 'kill-session', '-t', name]);
        if(result.exitCode !== 0 && await this.hasSession(handle, name)){
            throw DockerError.ExecFailed('tmux-kill-session');
        }
        // Even exit 0 is not enough if tmux still reports the target alive.
        if(await this.hasSession(handle, name)) throw DockerError.ExecFailed('tmux-kill-session');
    }

    /** Types a line into the session's pane and submits it (used for scheduled prompts). */
    async sendKeys(handle: IContainerHandle, name: string, text: string): Promise<void>{
        const result = await handle.exec(['tmux', 'send-keys', '-t', name, text, 'Enter']);
        if(result.exitCode !== 0) throw DockerError.ExecFailed('tmux-send-keys');
    }

    /** Opens a PTY attached to the tmux session — the stream the terminal gateway bridges. */
    attach(handle: IContainerHandle, name: string): Promise<PtyStream>{
        // Advertise a modern terminal to the tmux client so it (and the agent CLI it hosts)
        // negotiate 256-color + truecolor with xterm.js. Without TERM the exec PTY defaults to a
        // dumb terminal and the Ink-based CLIs drop to a degraded palette / no cursor addressing.
        return handle.openPty(['tmux', 'attach-session', '-t', name], {
            env: ['TERM=xterm-256color', 'COLORTERM=truecolor']
        });
    }

    /** Plain-text snapshot of the current pane, replayed to a client on join. */
    async capture(handle: IContainerHandle, name: string): Promise<string>{
        const result = await handle.exec(['tmux', 'capture-pane', '-p', '-t', name]);
        if(result.exitCode !== 0) throw DockerError.ExecFailed('tmux-capture');
        return result.output;
    }
}
