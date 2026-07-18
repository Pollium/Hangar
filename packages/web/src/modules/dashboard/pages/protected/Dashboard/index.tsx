import { AppShell } from '@/modules/sessions/components/AppShell';
import { useFleet } from '@/modules/dashboard/hooks/useFleet';
import { FleetGrid } from '@/modules/dashboard/components/FleetGrid';

const Dashboard = () => {
    const { sessions, connection } = useFleet();

    return (
        <AppShell>
            <div className='mx-auto flex w-full max-w-5xl flex-col gap-6 overflow-y-auto p-8'>
                <div className='flex items-center justify-between'>
                    <h1 className='text-lg font-semibold text-foreground'>Fleet</h1>
                    {connection !== 'open' && <span className='text-xs text-amber-500'>reconnecting…</span>}
                </div>
                <FleetGrid sessions={sessions} />
            </div>
        </AppShell>
    );
};

export default Dashboard;
