import type { ReactNode } from 'react';

// h-full (not min-h-full) so a `Row grow` child resolves a real height and flex-1 fills the
// viewport — min-height doesn't establish a definite height for flex distribution, which left
// full-height content (e.g. empty states) collapsing to their content. Tall content still scrolls:
// it overflows this fixed-height box and expands the parent ScrollShadow's scroll area.
export const Canvas = ({ children }: { children: ReactNode }) => (
    <div className='flex h-full flex-col'>{children}</div>
);

interface RowProps{
    children?: ReactNode;
    className?: string;
    grow?: boolean;
    max?: string;
}

// A full-bleed band with a centered content column.
export const Row = ({ children, className = '', grow = false, max = 'max-w-4xl' }: RowProps) => (
    <div className={`relative ${grow ? 'flex-1' : ''}`}>
        <div className={`relative mx-auto h-full w-full ${max} ${className}`}>
            {children}
        </div>
    </div>
);
