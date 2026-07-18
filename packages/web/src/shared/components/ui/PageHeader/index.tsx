import type { ReactNode } from 'react';

interface Props{
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
}

export const PageHeader = ({ title, description, actions }: Props) => (
    <div className='flex items-start justify-between gap-4 px-8 pt-12 pb-10'>
        <div className='flex flex-col gap-3'>
            <h1 className='text-3xl font-semibold tracking-tight text-foreground'>{title}</h1>
            {description && <p className='max-w-xl text-[15px] text-muted'>{description}</p>}
        </div>
        {actions && <div className='flex shrink-0 items-center gap-2'>{actions}</div>}
    </div>
);
