import { ScrollShadow } from '@heroui/react';
import { Columns2, Rows2, X, Code2, SquareTerminal } from 'lucide-react';
import { TerminalView } from '@/modules/sessions/components/Terminal';
import { CodespaceView } from '@/modules/codespaces/components/CodespaceView';
import { useFleet } from '@/modules/sessions/hooks/useFleet';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';
import { useWorkspaceStore } from '@/modules/sessions/store/workspace';
import type { LeafNode, PaneContent } from '@/modules/sessions/store/workspace';
import type { Session } from '@hangar/contracts/modules/session/domain';

const iconBtn = 'grid size-6 place-items-center rounded text-muted transition-colors hover:text-accent';

interface PickerProps{
    sessions: Session[];
    activeProjectId: number | null;
    onPick: (content: PaneContent) => void;
}

const Picker = ({ sessions, activeProjectId, onPick }: PickerProps) => (
    <div className='flex h-full min-h-0 flex-col'>
        <div className='flex flex-col gap-2 p-4'>
            <span className='mono-label text-muted'>Open in this pane</span>
            {activeProjectId !== null && (
                <button
                    type='button'
                    onClick={() => onPick({ kind: 'codespace', projectId: activeProjectId })}
                    className='flex items-center gap-2 rounded-md border border-hairline px-3 py-2 text-[13px] text-foreground transition-colors hover:border-accent/50 hover:text-accent'
                >
                    <Code2 className='size-4' aria-hidden='true' /> Codespace
                </button>
            )}
        </div>
        <ScrollShadow className='min-h-0 flex-1 px-4 pb-4'>
            {sessions.length === 0
                ? <p className='text-xs text-muted'>No sessions yet.</p>
                : sessions.map((session) => (
                    <button
                        key={session.id}
                        type='button'
                        onClick={() => onPick({ kind: 'terminal', sessionId: session.id })}
                        className='flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-foreground/[0.04]'
                    >
                        <SquareTerminal className='size-3.5 shrink-0 text-muted' aria-hidden='true' />
                        <span className='flex min-w-0 flex-col'>
                            <span className='truncate text-[13px] text-foreground'>{session.title}</span>
                            <span className='truncate text-[11px] text-muted/70'>{session.cliType}</span>
                        </span>
                    </button>
                ))}
        </ScrollShadow>
    </div>
);

export const Pane = ({ leaf }: { leaf: LeafNode }) => {
    const { sessions } = useFleet();
    const activeProjectId = useActiveProjectStore((state) => state.activeProjectId);
    const activeLeafId = useWorkspaceStore((state) => state.activeLeafId);
    const setActive = useWorkspaceStore((state) => state.setActive);
    const split = useWorkspaceStore((state) => state.split);
    const close = useWorkspaceStore((state) => state.close);
    const assign = useWorkspaceStore((state) => state.assign);

    const active = leaf.id === activeLeafId;
    const { content } = leaf;

    const title = content === null
        ? 'Empty pane'
        : content.kind === 'codespace'
            ? 'Codespace'
            : sessions.find((session) => session.id === content.sessionId)?.title ?? `Session #${content.sessionId}`;

    return (
        <div
            onMouseDownCapture={() => { if(!active) setActive(leaf.id); }}
            className='flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl'
        >
            <div className='flex h-8 shrink-0 items-center gap-2 border-b border-hairline px-2'>
                <span className='flex min-w-0 items-center gap-1.5'>
                    {content?.kind === 'codespace'
                        ? <Code2 className='size-3.5 shrink-0 text-muted' aria-hidden='true' />
                        : <SquareTerminal className='size-3.5 shrink-0 text-muted' aria-hidden='true' />}
                    <span className='truncate text-[12px] text-foreground'>{title}</span>
                </span>
                <span className='min-w-0 flex-1' />
                <button type='button' className={iconBtn} aria-label='Split right' title='Split right' onClick={() => split('row')}>
                    <Columns2 className='size-3.5' aria-hidden='true' />
                </button>
                <button type='button' className={iconBtn} aria-label='Split down' title='Split down' onClick={() => split('col')}>
                    <Rows2 className='size-3.5' aria-hidden='true' />
                </button>
                <button
                    type='button'
                    className={`${iconBtn} hover:text-danger`}
                    aria-label='Close pane'
                    title='Close pane'
                    onClick={() => close(leaf.id)}
                >
                    <X className='size-3.5' aria-hidden='true' />
                </button>
            </div>

            <div className='min-h-0 min-w-0 flex-1'>
                {content === null ? (
                    <Picker sessions={sessions} activeProjectId={activeProjectId} onPick={(picked) => assign(leaf.id, picked)} />
                ) : content.kind === 'terminal' ? (
                    <TerminalView key={content.sessionId} sessionId={content.sessionId} paneId={leaf.id} />
                ) : (
                    <CodespaceView key={content.projectId} projectId={content.projectId} />
                )}
            </div>
        </div>
    );
};
