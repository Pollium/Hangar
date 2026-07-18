import { useTerminal } from '@/modules/sessions/hooks/useTerminal';

export const TerminalView = ({ sessionId }: { sessionId: number }) => {
    const { containerRef, connection, agentStatus } = useTerminal(sessionId);

    return (
        <div className='flex h-full flex-col'>
            <div className='flex h-9 shrink-0 items-center justify-between border-b border-hairline px-4'>
                <span className='mono-label text-muted/70'>
                    session #{sessionId}{agentStatus ? ` · ${agentStatus.replace('_', ' ')}` : ''}
                </span>
                {connection !== 'open' && <span className='mono-label text-warning'>reconnecting</span>}
            </div>
            <div className='min-h-0 flex-1 bg-[#0d0d10] p-2'>
                <div ref={containerRef} className='h-full w-full' />
            </div>
        </div>
    );
};
