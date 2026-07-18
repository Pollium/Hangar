import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useChannel } from '@/shared/hooks/socket/useChannel';
import type { SessionStatus } from '@cloud-code/contracts/modules/session/domain';
import type {
    TerminalOutputData,
    TerminalStatusData,
    TerminalExitData
} from '@cloud-code/contracts/modules/session/terminal';

export const useTerminal = (sessionId: number) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitRef = useRef<FitAddon | null>(null);
    const [agentStatus, setAgentStatus] = useState<SessionStatus | null>(null);

    const { send, status: connection } = useChannel('/sessions/terminal', {
        'terminal.output': (data) => termRef.current?.write((data as TerminalOutputData).chunk),
        'terminal.status': (data) => setAgentStatus((data as TerminalStatusData).status),
        'terminal.exit': (data) => termRef.current?.write(`\r\n\x1b[90m[process exited: ${(data as TerminalExitData).code ?? 'unknown'}]\x1b[0m\r\n`)
    });

    // Create the terminal once and wire keystrokes + resize.
    useEffect(() => {
        if(!containerRef.current) return;

        const term = new Terminal({
            convertEol: true,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 13,
            cursorBlink: true,
            theme: { background: '#0a0a0a', foreground: '#e4e4e7' }
        });
        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(containerRef.current);
        fit.fit();
        termRef.current = term;
        fitRef.current = fit;

        const keystrokes = term.onData((data) => send('terminal.input', { data }));
        const pushResize = () => {
            fit.fit();
            send('terminal.resize', { cols: term.cols, rows: term.rows });
        };
        const observer = new ResizeObserver(pushResize);
        observer.observe(containerRef.current);

        return () => {
            keystrokes.dispose();
            observer.disconnect();
            term.dispose();
            termRef.current = null;
            fitRef.current = null;
        };
    }, [send]);

    // Join (and re-join on reconnect) — the server replies with a snapshot + live stream.
    useEffect(() => {
        if(connection !== 'open') return;
        send('terminal.join', { sessionId });
    }, [connection, sessionId, send]);

    return { containerRef, connection, agentStatus };
};
