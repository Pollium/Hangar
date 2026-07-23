import { ScrollShadow } from '@heroui/react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { SessionItem } from '@/modules/sessions/components/SessionItem';
import { SidebarSection } from '@/modules/sessions/components/SidebarSection';
import { useNewSessionModalStore } from '@/modules/sessions/store/newSessionModal';
import type { Session } from '@hangar/contracts/modules/session/domain';

const iconBtn = 'grid size-6 place-items-center rounded text-muted transition-colors hover:text-accent disabled:opacity-50';

interface Props{
    sessions: Session[];
    loading: boolean;
}

export const SessionSidebar = ({ sessions, loading }: Props) => {
    const params = useParams();
    const activeId = params.id ? Number(params.id) : null;
    const openNewSession = useNewSessionModalStore((state) => state.open);

    return (
        <SidebarSection
            panel='sessions'
            title='Sessions'
            actions={
                <button
                    type='button'
                    onClick={openNewSession}
                    className={iconBtn}
                    aria-label='New session'
                    title='New session'
                >
                    <Plus className='size-3.5' aria-hidden='true' />
                </button>
            }
        >
            <ScrollShadow className='flex min-h-0 flex-1 flex-col pb-2'>
                {loading && sessions.length === 0 && (
                    <p className='px-4 py-2 text-xs text-muted'>Loading…</p>
                )}
                {!loading && sessions.length === 0 && (
                    <p className='px-4 py-2 text-xs text-muted'>No sessions yet.</p>
                )}
                {sessions.map((session) => (
                    <SessionItem key={session.id} session={session} active={session.id === activeId} />
                ))}
            </ScrollShadow>
        </SidebarSection>
    );
};
