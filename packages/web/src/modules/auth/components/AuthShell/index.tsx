import type { ReactNode } from 'react';

// Centered max-w-sm card shared by the guest auth screens (sign in, forgot/reset password).
export const AuthShell = ({ children }: { children: ReactNode }) => (
    <main className='flex min-h-dvh items-center justify-center bg-background p-4'>
        <section className='w-full max-w-sm'>{children}</section>
    </main>
);
