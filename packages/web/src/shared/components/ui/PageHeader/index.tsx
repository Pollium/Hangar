import type { ReactNode } from 'react';

interface Props{
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
}

export const PageHeader = ({ title, description, actions }: Props) => (
    <div className='flex flex-col items-start justify-between gap-5 sm:flex-row sm:gap-4'>
        <div className='flex flex-col gap-3'>
            <h1 className='text-2xl font-semibold tracking-tight text-foreground sm:text-3xl'>{title}</h1>
            {description && <p className='max-w-xl text-sm leading-6 text-muted sm:text-[15px]'>{description}</p>}
        </div>
        {actions && <div className='flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0'>{actions}</div>}
    </div>
);
