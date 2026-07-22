import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CircleAlert, Plus } from 'lucide-react';
import { AppShell } from '@/modules/sessions/components/AppShell';
import { Canvas, Row } from '@/shared/components/ui/Blueprint';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { useFleet } from '@/modules/sessions/hooks/useFleet';
import { FleetGrid } from '@/modules/dashboard/components/FleetGrid';
import { useNewSessionModalStore } from '@/modules/sessions/store/newSessionModal';

interface MetricProps{
    label: string;
    value: number | string;
    /** Accent bar + active value color. */
    accent: string;
    active: boolean;
}

const Metric = ({ label, value, accent, active }: MetricProps) => (
    <div className='flex flex-col gap-2 px-5 py-5 sm:px-6'>
        <span className={`h-0.5 w-8 rounded-full ${active ? accent : 'bg-foreground/10'}`} aria-hidden='true' />
        <span className={`text-3xl font-semibold tracking-tight tabular-nums ${active ? 'text-foreground' : 'text-muted/70'}`}>{value}</span>
        <span className='text-xs text-muted'>{label}</span>
    </div>
);

const Overview = () => {
    const { sessions, loading, error } = useFleet();

    const counts = useMemo(() => ({
        attention: sessions.filter((session) => session.status === 'waiting_input').length,
        active: sessions.filter((session) => session.status === 'running' || session.status === 'starting').length,
        idle: sessions.filter((session) => session.status === 'idle').length,
        error: sessions.filter((session) => session.status === 'error').length
    }), [sessions]);

    const metricValue = (value: number): number | string => loading && sessions.length === 0 ? '—' : value;

    return (
        <AppShell>
            <Canvas>
                <Row max='max-w-6xl'>
                    <PageHeader
                        title='Overview'
                        actions={(
                            <button
                                type='button'
                                onClick={() => useNewSessionModalStore.getState().open()}
                                className='inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover'
                            >
                                <Plus className='size-3.5' aria-hidden='true' />
                                New session
                            </button>
                        )}
                    />
                </Row>

                <Row max='max-w-6xl' className='mt-10'>
                    <div className='grid grid-cols-2 divide-x divide-[var(--hairline)] overflow-hidden rounded-xl border border-hairline lg:grid-cols-4' aria-busy={loading}>
                        <Metric label='Needs input' value={metricValue(counts.attention)} accent='bg-warning' active={counts.attention > 0} />
                        <Metric label='Active now' value={metricValue(counts.active)} accent='bg-success' active={counts.active > 0} />
                        <Metric label='Idle' value={metricValue(counts.idle)} accent='bg-foreground/40' active={counts.idle > 0} />
                        <Metric label='Errors' value={metricValue(counts.error)} accent='bg-danger' active={counts.error > 0} />
                    </div>
                </Row>

                {error && (
                    <Row max='max-w-6xl'>
                        <div role='alert' className='mt-3 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-foreground'>
                            <CircleAlert className='size-4 shrink-0 text-danger' aria-hidden='true' />
                            Fleet updates are unavailable: {error} Existing data may be stale.
                        </div>
                    </Row>
                )}

                <Row grow max='max-w-6xl' className='mt-10'>
                    <FleetGrid sessions={sessions} loading={loading} error={error} />
                </Row>
            </Canvas>
        </AppShell>
    );
};

const Dashboard = () => {
    const location = useLocation();
    return location.pathname === '/dashboard'
        ? <Navigate to='/' replace />
        : <Overview />;
};

export default Dashboard;
