import { useTerminal } from '@/modules/sessions/hooks/useTerminal';

export const TerminalView = ({ sessionId }: { sessionId: number }) => {
    const { containerRef, connection, agentStatus } = useTerminal(sessionId);

    return (
        <div className='relative flex h-full flex-col'>
            <div className='flex h-9 shrink-0 items-center justify-between px-4 text-xs text-muted'>
                <span>Session #{sessionId}{agentStatus ? ` · ${agentStatus.replace('_', ' ')}` : ''}</span>
                {connection !== 'open' && <span className='text-amber-500'>reconnecting…</span>}
            </div>
            <div className='min-h-0 flex-1 bg-[#0a0a0a] p-2'>
                <div ref={containerRef} className='h-full w-full' />
            </div>
        </div>
    );
};
