import type { ComponentType, ReactNode } from 'react';

interface Props{
    icon?: ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    action?: ReactNode;
}

export const EmptyState = ({ icon: Icon, title, description, action }: Props) => (
    <div className='flex h-full min-h-72 flex-1 flex-col items-center justify-center gap-4 rounded-2xl bg-surface/40 px-6 text-center'>
        {Icon && (
            <span className='grid size-11 place-items-center rounded-2xl bg-foreground/[0.05] text-muted' aria-hidden='true'>
                <Icon className='size-5' />
            </span>
        )}
        <div className='flex flex-col gap-1'>
            <h2 className='text-sm font-medium text-foreground'>{title}</h2>
            {description && <p className='max-w-sm text-xs leading-5 text-muted'>{description}</p>}
        </div>
        {action}
    </div>
);
