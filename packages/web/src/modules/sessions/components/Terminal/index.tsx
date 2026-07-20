import { useTerminal } from '@/modules/sessions/hooks/useTerminal';

export const TerminalView = ({ sessionId, paneId }: { sessionId: number; paneId?: string }) => {
    const { containerRef, agentStatus, error, retry } = useTerminal(sessionId, paneId);
    const failed = Boolean(error) || agentStatus === 'error';

    return (
        <div className='flex h-full w-full min-w-0 flex-col overflow-hidden'>
            {failed && (
                <div role='alert' className='flex shrink-0 items-center justify-between gap-4 border-b border-danger/30 bg-danger/10 px-4 py-2 text-xs text-foreground'>
                    <span className='truncate'>{error ? `Session failed: ${error}` : 'The CLI process exited unexpectedly.'}</span>
                    <button type='button' onClick={retry} className='shrink-0 rounded border border-danger/40 px-2 py-1 font-medium hover:bg-danger/10'>
                        Retry
                    </button>
                </div>
            )}
            <div className='min-h-0 min-w-0 flex-1 overflow-hidden bg-[#0d0d10]'>
                <div ref={containerRef} className='h-full w-full min-w-0 overflow-hidden' />
            </div>
        </div>
    );
};
