import type Docker from 'dockerode';
import type { PtyStream, ExecOptions } from './contracts';

const INSPECT_TIMEOUT_MS = 75;
const EXIT_INSPECT_ATTEMPTS = 4;

/** Resolve Docker exec inspection without letting a daemon call hang the PTY close path. */
const inspectWithin = async (exec: Docker.Exec): Promise<Docker.ExecInspectInfo | undefined> =>
    Promise.race([
        exec.inspect(),
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), INSPECT_TIMEOUT_MS))
    ]);

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

    let resolveExit!: (code: number | null) => void;
    let settled = false;
    let inspecting = false;
    stream.exitCode = new Promise<number | null>((resolve) => { resolveExit = resolve; });

    const settle = (code: number | null): void => {
        if(settled) return;
        settled = true;
        resolveExit(code);
    };

    const inspectExit = (): void => {
        if(inspecting || settled) return;
        inspecting = true;
        void (async () => {
            for(let attempt = 0; attempt < EXIT_INSPECT_ATTEMPTS; attempt += 1){
                try{
                    const info = await inspectWithin(exec);
                    if(info?.Running === false){
                        settle(info.ExitCode ?? null);
                        return;
                    }
                }catch{
                    settle(null);
                    return;
                }
                await new Promise((next) => setTimeout(next, 25));
            }
            settle(null);
        })();
    };

    stream.once('end', inspectExit);
    stream.once('close', inspectExit);
    stream.once('error', inspectExit);

    // A very short exec can close while exec.start() is resolving, before listeners exist.
    // Stream state catches the real socket case; one bounded inspect covers mocked/adaptor races.
    if(stream.destroyed || stream.closed || stream.readableEnded || stream.writableEnded){
        inspectExit();
    }else{
        void inspectWithin(exec)
            .then((info) => { if(info?.Running === false) settle(info.ExitCode ?? null); })
            .catch(() => undefined);
    }

    return stream;
};
