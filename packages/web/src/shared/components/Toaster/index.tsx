import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore } from '@/shared/store/toast';
import type { ToastKind } from '@/shared/store/toast';

const styles: Record<ToastKind, { icon: typeof Info; accent: string }> = {
    success: { icon: CheckCircle2, accent: 'text-success' },
    error: { icon: AlertCircle, accent: 'text-danger' },
    info: { icon: Info, accent: 'text-accent' }
};

/** Stacked transient toasts, bottom-right. Mounted once in the app shell. */
export const Toaster = () => {
    const toasts = useToastStore((state) => state.toasts);
    const dismiss = useToastStore((state) => state.dismiss);

    if(toasts.length === 0) return null;

    return (
        <div className='pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,22rem)] flex-col gap-2' role='region' aria-label='Notifications'>
            {toasts.map((item) => {
                const { icon: Icon, accent } = styles[item.kind];
                return (
                    <div
                        key={item.id}
                        role={item.kind === 'error' ? 'alert' : 'status'}
                        className='pointer-events-auto flex items-start gap-2.5 rounded-lg border border-hairline bg-surface px-3 py-2.5 shadow-lg'
                    >
                        <Icon className={`mt-0.5 size-4 shrink-0 ${accent}`} aria-hidden='true' />
                        <span className='min-w-0 flex-1 break-words text-[13px] text-foreground'>{item.message}</span>
                        <button
                            type='button'
                            onClick={() => dismiss(item.id)}
                            className='grid size-5 shrink-0 place-items-center rounded text-muted transition-colors hover:text-foreground'
                            aria-label='Dismiss'
                        >
                            <X className='size-3.5' aria-hidden='true' />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
