import type { ReactNode } from 'react';

export const Canvas = ({ children }: { children: ReactNode }) => (
    <div className='flex min-h-full flex-col'>{children}</div>
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
