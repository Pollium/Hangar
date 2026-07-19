import { useMemo, useState, type ComponentType } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
    Activity,
    AlertTriangle,
    CircleAlert,
    Clock3,
    Plus
} from 'lucide-react';
import { AppShell } from '@/modules/sessions/components/AppShell';
import { Canvas, Row } from '@/shared/components/ui/Blueprint';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { useFleet } from '@/modules/sessions/hooks/useFleet';
import { FleetGrid } from '@/modules/dashboard/components/FleetGrid';
import { useNewSessionModalStore } from '@/modules/sessions/store/newSessionModal';
import type { SessionStatus } from '@cloud-code/contracts/modules/session/domain';

type FleetFilter = 'all' | 'attention' | 'active' | 'idle' | 'error' | 'stopped';

const FILTERS: Array<{ id: FleetFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'attention', label: 'Needs input' },
    { id: 'active', label: 'Active' },
    { id: 'idle', label: 'Idle' },
    { id: 'error', label: 'Errors' },
    { id: 'stopped', label: 'Stopped' }
];

const matchesFilter = (status: SessionStatus, filter: FleetFilter): boolean => {
    if(filter === 'all') return true;
    if(filter === 'attention') return status === 'waiting_input';
    if(filter === 'active') return status === 'running' || status === 'starting';
    return status === filter;
};

interface MetricProps{
    label: string;
    value: number | string;
    icon: ComponentType<{ className?: string }>;
    tone: string;
}

const Metric = ({ label, value, icon: Icon, tone }: MetricProps) => (
    <div className='flex items-center justify-between gap-4 bg-background px-5 py-5 sm:px-6'>
        <div className='flex flex-col gap-1'>
            <span className='text-2xl font-semibold tracking-tight text-foreground'>{value}</span>
            <span className='text-xs text-muted'>{label}</span>
        </div>
        <span className={`grid size-9 place-items-center rounded-xl ${tone}`} aria-hidden='true'>
            <Icon className='size-4' />
        </span>
    </div>
);

const Overview = () => {
    const { sessions, loading, error } = useFleet();
    const [filter, setFilter] = useState<FleetFilter>('all');

    const visible = useMemo(
        () => sessions.filter((session) => matchesFilter(session.status, filter)),
        [filter, sessions]
    );

    const counts = useMemo(() => ({
        attention: sessions.filter((session) => session.status === 'waiting_input').length,
        active: sessions.filter((session) => session.status === 'running' || session.status === 'starting').length,
        idle: sessions.filter((session) => session.status === 'idle').length,
        error: sessions.filter((session) => session.status === 'error').length
    }), [sessions]);

    const clearFilters = () => setFilter('all');

    const metricValue = (value: number): number | string => loading && sessions.length === 0 ? '—' : value;

    return (
        <AppShell>
            <Canvas>
                <Row max='max-w-6xl'>
                    <PageHeader
                        title='Overview'
                        description='Your agents in one place—what is active, what needs you, and where every session is running.'
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

                <Row max='max-w-6xl'>
                    <div className='grid grid-cols-2 gap-px bg-[var(--hairline)] lg:grid-cols-4' aria-busy={loading}>
                        <Metric label='Needs input' value={metricValue(counts.attention)} icon={AlertTriangle} tone='bg-warning/10 text-foreground' />
                        <Metric label='Active now' value={metricValue(counts.active)} icon={Activity} tone='bg-success/10 text-foreground' />
                        <Metric label='Idle' value={metricValue(counts.idle)} icon={Clock3} tone='bg-foreground/[0.05] text-foreground' />
                        <Metric label='Errors' value={metricValue(counts.error)} icon={CircleAlert} tone='bg-danger/10 text-foreground' />
                    </div>
                </Row>

                <Row max='max-w-6xl' className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end'>
                    <div className='flex flex-wrap items-center gap-1' aria-label='Filter sessions'>
                        {FILTERS.map((item) => (
                            <button
                                key={item.id}
                                type='button'
                                onClick={() => setFilter(item.id)}
                                aria-pressed={filter === item.id}
                                className={`h-8 rounded-md px-3 text-xs transition-colors ${
                                    filter === item.id
                                        ? 'bg-foreground text-background'
                                        : 'text-muted hover:bg-foreground/[0.05] hover:text-foreground'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </Row>

                {error && (
                    <Row max='max-w-6xl'>
                        <div role='alert' className='flex items-center gap-2 border-l-2 border-danger bg-danger/10 px-5 py-3 text-xs text-foreground sm:px-8'>
                            <CircleAlert className='size-4 shrink-0' aria-hidden='true' />
                            Fleet updates are unavailable: {error} Existing data may be stale.
                        </div>
                    </Row>
                )}

                <Row grow max='max-w-6xl'>
                    <FleetGrid
                        sessions={visible}
                        isFiltered={filter !== 'all'}
                        loading={loading}
                        error={error}
                        onClearFilters={clearFilters}
                    />
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
