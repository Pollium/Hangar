import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast{
    id: number;
    kind: ToastKind;
    message: string;
}

interface ToastState{
    toasts: Toast[];
    push: (kind: ToastKind, message: string) => void;
    dismiss: (id: number) => void;
}

let counter = 0;

/**
 * Minimal transient-toast store. The app has no toast system otherwise (errors were inline-only);
 * this backs a single <Toaster/> mounted in the shell. Toasts auto-dismiss after a few seconds.
 */
export const useToastStore = create<ToastState>((set) => ({
    toasts: [],
    push: (kind, message) => {
        counter += 1;
        const id = counter;
        set((state) => ({ toasts: [...state.toasts, { id, kind, message }] }));
        // Auto-dismiss; errors linger a little longer than success/info.
        const ttl = kind === 'error' ? 6000 : 3500;
        setTimeout(() => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })), ttl);
    },
    dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
}));

/** Imperative helpers so non-component code can raise a toast. */
export const toast = {
    success: (message: string) => useToastStore.getState().push('success', message),
    error: (message: string) => useToastStore.getState().push('error', message),
    info: (message: string) => useToastStore.getState().push('info', message)
};
