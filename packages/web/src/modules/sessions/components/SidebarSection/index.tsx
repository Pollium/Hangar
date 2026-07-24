import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useSidebarPanelsStore } from '@/modules/sessions/store/sidebarPanels';
import type { SidebarPanel } from '@/modules/sessions/store/sidebarPanels';

/** Shared class for the icon buttons rendered in a section's `actions` slot (refresh, clone, +…). */
export const sectionActionButton = 'grid size-6 place-items-center rounded text-muted transition-colors hover:text-accent disabled:opacity-50';

interface Props{
    panel: SidebarPanel;
    title: string;
    /**
     * Replaces the header's title text when provided (the collapse chevron stays). Used by Source
     * Control to surface its repo picker where the title would be. Falls back to `title` when the
     * section is collapsed or no slot is given.
     */
    titleSlot?: ReactNode;
    /** Header-right controls (refresh, clone, …). Clicks here don't toggle the section. */
    actions?: ReactNode;
    children: ReactNode;
}

/**
 * A collapsible, vertically resizable sidebar section (Explorer, Source Control). The header
 * toggles collapse; a drag handle along the top edge resizes the body, persisting the height to
 * the shared store. When collapsed only the header shows and the resize handle is hidden.
 */
export const SidebarSection = ({ panel, title, titleSlot, actions, children }: Props) => {
    const { collapsed, height } = useSidebarPanelsStore((state) => state[panel]);
    const toggle = useSidebarPanelsStore((state) => state.toggle);
    const setHeight = useSidebarPanelsStore((state) => state.setHeight);
    const dragging = useRef<{ startY: number; startHeight: number } | null>(null);

    // Drag the top edge: moving up grows the section (its body sits below the handle), down shrinks.
    useEffect(() => {
        const onMove = (event: MouseEvent) => {
            if(!dragging.current) return;
            const delta = dragging.current.startY - event.clientY;
            setHeight(panel, dragging.current.startHeight + delta);
        };
        const onUp = () => {
            if(!dragging.current) return;
            dragging.current = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [panel, setHeight]);

    const startResize = (event: React.MouseEvent) => {
        event.preventDefault();
        dragging.current = { startY: event.clientY, startHeight: height };
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    };

    return (
        <div className='relative flex shrink-0 flex-col border-t border-hairline'>
            {!collapsed && (
                <div
                    role='separator'
                    aria-orientation='horizontal'
                    onMouseDown={startResize}
                    className='absolute inset-x-0 -top-0.5 z-10 h-1 cursor-row-resize transition-colors hover:bg-accent/40'
                    title='Drag to resize'
                />
            )}
            <div className='flex items-center justify-between gap-2 px-4 pt-3 pb-1.5'>
                {titleSlot && !collapsed ? (
                    <>
                        <button
                            type='button'
                            onClick={() => toggle(panel)}
                            className='shrink-0 text-muted transition-colors hover:text-foreground'
                            aria-expanded={!collapsed}
                            aria-label={`Collapse ${title}`}
                        >
                            <ChevronDown className='size-3.5' aria-hidden='true' />
                        </button>
                        <span className='min-w-0 flex-1'>{titleSlot}</span>
                    </>
                ) : (
                    <button
                        type='button'
                        onClick={() => toggle(panel)}
                        className='flex min-w-0 items-center gap-1 text-muted transition-colors hover:text-foreground'
                        aria-expanded={!collapsed}
                    >
                        {collapsed ? <ChevronRight className='size-3.5' aria-hidden='true' /> : <ChevronDown className='size-3.5' aria-hidden='true' />}
                        <span className='mono-label'>{title}</span>
                    </button>
                )}
                {actions && <span className='flex shrink-0 items-center gap-0.5'>{actions}</span>}
            </div>

            {!collapsed && (
                <div className='flex min-h-0 flex-col overflow-hidden' style={{ height }}>
                    {children}
                </div>
            )}
        </div>
    );
};
