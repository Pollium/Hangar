import { AppShell } from '@/modules/sessions/components/AppShell';

const Home = () => (
    <AppShell>
        <div className='flex h-full flex-col items-center justify-center gap-2 text-center'>
            <p className='text-sm font-medium text-foreground'>Select a session</p>
            <p className='text-xs text-muted'>Pick one from the sidebar, or hit + to start a new agent.</p>
        </div>
    </AppShell>
);

export default Home;
