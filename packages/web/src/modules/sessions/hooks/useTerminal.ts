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
            // Full 16-colour ANSI palette so agent CLIs (diffs, prompts, spinners) stay readable
            // on the dark background — the xterm defaults wash out on near-black.
            theme: {
                background: '#0d0d10',
                foreground: '#e6e6e9',
                cursor: '#e6e6e9',
                cursorAccent: '#0d0d10',
                selectionBackground: '#3a3a45',
                black: '#1a1a1f',
                red: '#ff6b6b',
                green: '#5bd97f',
                yellow: '#f0c674',
                blue: '#7aa2f7',
                magenta: '#bb9af7',
                cyan: '#56cfd6',
                white: '#d5d5da',
                brightBlack: '#6b6b76',
                brightRed: '#ff8787',
                brightGreen: '#8fe0a3',
                brightYellow: '#ffd88a',
                brightBlue: '#a3c0ff',
                brightMagenta: '#d0b8ff',
                brightCyan: '#8ae5ea',
                brightWhite: '#ffffff'
            }
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
