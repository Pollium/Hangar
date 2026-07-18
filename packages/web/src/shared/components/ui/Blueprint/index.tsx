import type { ReactNode } from 'react';
import Crosshairs from '@/shared/components/ui/Crosshairs';

export const Canvas = ({ children }: { children: ReactNode }) => (
    <div className='flex min-h-full flex-col'>{children}</div>
);

interface RowProps{
    children?: ReactNode;
    className?: string;
    grow?: boolean;
    max?: string;
}

// A full-bleed hairline band with a centered, cross-bordered content column.
export const Row = ({ children, className = '', grow = false, max = 'max-w-4xl' }: RowProps) => (
    <div className={`relative border-b border-hairline ${grow ? 'flex-1' : ''}`}>
        <div className={`relative mx-auto h-full w-full border-x border-hairline ${max} ${className}`}>
            <Crosshairs />
            {children}
        </div>
    </div>
);
