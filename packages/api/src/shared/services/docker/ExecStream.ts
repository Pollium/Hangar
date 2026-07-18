import type Docker from 'dockerode';
import type { PtyStream, ExecOptions } from './contracts';

/**
 * Opens a PTY-backed exec inside a container and hijacks the duplex stream. With Tty:true
 * there is no stdout/stderr multiplexing — the stream is raw terminal bytes, exactly what
 * xterm.js expects on the browser side. Writing to the stream feeds the process stdin.
 */
export const openPty = async (
    container: Docker.Container,
    cmd: string[],
    opts: ExecOptions = {}
): Promise<PtyStream> => {
    const exec = await container.exec({
        Cmd: cmd,
        Tty: true,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: opts.cwd,
        Env: opts.env
    });

    const stream = await exec.start({ hijack: true, stdin: true, Tty: true }) as unknown as PtyStream;
    stream.resize = (cols: number, rows: number): void => {
        void exec.resize({ w: cols, h: rows }).catch(() => {
            // resize races container teardown; a failed resize is not fatal to the session
        });
    };

    return stream;
};
