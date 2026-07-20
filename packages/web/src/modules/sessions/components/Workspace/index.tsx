import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { Pane } from '@/modules/sessions/components/Pane';
import { useWorkspaceStore } from '@/modules/sessions/store/workspace';
import type { WorkspaceNode } from '@/modules/sessions/store/workspace';

const NodeView = ({ node }: { node: WorkspaceNode }): ReactNode => {
    if(node.type === 'leaf') return <Pane leaf={node} />;

    const handleClass = node.dir === 'row'
        ? 'w-1 bg-transparent transition-colors hover:bg-accent/40'
        : 'h-1 bg-transparent transition-colors hover:bg-accent/40';

    return (
        <Group orientation={node.dir === 'row' ? 'horizontal' : 'vertical'} className='min-h-0 min-w-0'>
            {node.children.map((child, index) => (
                <Fragment key={child.id}>
                    {index > 0 && <Separator className={handleClass} />}
                    <Panel minSize='10' className='min-h-0 min-w-0'>
                        <NodeView node={child} />
                    </Panel>
                </Fragment>
            ))}
        </Group>
    );
};

export const Workspace = () => {
    const root = useWorkspaceStore((state) => state.root);
    const split = useWorkspaceStore((state) => state.split);

    if(!root){
        // `split` with no root creates a single empty pane (picker), the way back after the last
        // pane is closed — re-navigating to the current route won't re-fire the seeding effect.
        return (
            <div className='flex h-full w-full flex-col items-center justify-center gap-3 text-sm text-muted'>
                No panes open.
                <button
                    type='button'
                    onClick={() => split('row')}
                    className='flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-[13px] text-foreground transition-colors hover:border-accent/50 hover:text-accent'
                >
                    <Plus className='size-3.5' aria-hidden='true' /> New pane
                </button>
            </div>
        );
    }

    return (
        <div className='h-full w-full p-2'>
            <NodeView node={root} />
        </div>
    );
};
