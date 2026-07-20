import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useChannel } from '@/shared/hooks/socket/useChannel';
import TerminalInputGate from '@/modules/sessions/hooks/TerminalInputGate';
import type { SessionStatus } from '@hangar/contracts/modules/session/domain';

export const useTerminal = (sessionId: number, paneId?: string) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitRef = useRef<FitAddon | null>(null);
    const resizeRef = useRef<() => void>(() => undefined);
    const sendRef = useRef<(type: string, data?: unknown) => boolean>(() => false);
    const clearErrorRef = useRef<() => void>(() => undefined);
    const joinRef = useRef<(restart?: boolean) => void>(() => undefined);
    const [inputGate] = useState(() => new TerminalInputGate((data) => (
        sendRef.current('terminal.input', { data })
    )));
    const [agentStatus, setAgentStatus] = useState<SessionStatus | null>(null);
    const [dimensions, setDimensions] = useState({ cols: 0, rows: 0 });

    const { send, clearError, status: connection, error } = useChannel('/sessions/terminal', {
        'terminal.output': (data) => termRef.current?.write(data.chunk),
        'terminal.status': (data) => setAgentStatus(data.status),
        'terminal.exit': (data) => {
            inputGate.block(true);
            setAgentStatus('error');
            termRef.current?.write(`\r\n\x1b[90m[process exited: ${data.code ?? 'unknown'}]\x1b[0m\r\n`);
        },
        'terminal.closed': (data) => {
            if(data.reason === 'restarted'){
                setAgentStatus('starting');
                termRef.current?.write('\r\n\x1b[90m[switching CLI…]\x1b[0m\r\n');
                joinRef.current(true);
                return;
            }
            inputGate.block(true);
            setAgentStatus('stopped');
            termRef.current?.write(`\r\n\x1b[90m[session ${data.reason}]\x1b[0m\r\n`);
        },
        // The gateway sends ready only after the socket owns a live PTY attachment.
        'terminal.ready': () => {
            clearErrorRef.current();
            resizeRef.current();
            inputGate.open();
        }
    // A dedicated socket per pane: the gateway attaches one session per socket, so tiled
    // terminals must not share the pooled connection or their output frames would cross.
    }, { instanceKey: paneId });
    sendRef.current = send;
    clearErrorRef.current = clearError;

    // Create the terminal once and wire keystrokes + resize.
    useEffect(() => {
        if(!containerRef.current) return;

        const term = new Terminal({
            // Docker provides raw PTY bytes. Rewriting LF into CRLF corrupts cursor-sensitive
            // fullscreen TUIs such as OpenCode; snapshots are normalized by the gateway.
            convertEol: false,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 13,
            cursorBlink: true,
            scrollback: 10_000,
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
        termRef.current = term;
        fitRef.current = fit;

        let resizeFrame: number | null = null;
        const pushResize = () => {
            if(resizeFrame !== null) cancelAnimationFrame(resizeFrame);
            resizeFrame = requestAnimationFrame(() => {
                resizeFrame = null;
                fit.fit();
                if(term.cols > 0 && term.rows > 0){
                    setDimensions((current) => current.cols === term.cols && current.rows === term.rows
                        ? current
                        : { cols: term.cols, rows: term.rows });
                    send('terminal.resize', { cols: term.cols, rows: term.rows });
                }
            });
        };
        resizeRef.current = pushResize;

        const keystrokes = term.onData((data) => inputGate.push(data));
        const observer = new ResizeObserver(pushResize);
        observer.observe(containerRef.current);
        pushResize();
        void document.fonts.ready.then(pushResize);
        term.focus();

        return () => {
            if(resizeFrame !== null) cancelAnimationFrame(resizeFrame);
            keystrokes.dispose();
            observer.disconnect();
            inputGate.block(true);
            resizeRef.current = () => undefined;
            term.dispose();
            termRef.current = null;
            fitRef.current = null;
        };
    }, [inputGate, send]);

    const join = useCallback((restart = false) => {
        inputGate.block();
        fitRef.current?.fit();
        const term = termRef.current;
        send('terminal.join', {
            sessionId,
            ...(restart ? { restart: true } : {}),
            ...(term ? { cols: term.cols, rows: term.rows } : {})
        });
    }, [inputGate, send, sessionId]);
    joinRef.current = join;

    // Block immediately whenever the transport is unavailable; a successful rejoin opens the
    // gate only through terminal.ready, preserving keystrokes typed during reconnection.
    useEffect(() => {
        if(connection !== 'open') inputGate.block();
    }, [connection, inputGate]);

    // Join (and re-join on reconnect) with the dimensions already measured by xterm.
    useEffect(() => {
        if(connection === 'open') join();
    }, [connection, join]);

    const retry = () => {
        setAgentStatus('starting');
        join(true);
    };

    return { containerRef, connection, agentStatus, dimensions, error, retry };
};
