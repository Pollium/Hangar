import { AppShell } from '@/modules/sessions/components/AppShell';
import { Canvas, Row } from '@/shared/components/ui/Blueprint';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { useFleet } from '@/modules/dashboard/hooks/useFleet';
import { FleetGrid } from '@/modules/dashboard/components/FleetGrid';

const Dashboard = () => {
    const { sessions, connection } = useFleet();
    const attention = sessions.filter((s) => s.status === 'waiting_input').length;

    return (
        <AppShell title='Fleet'>
            <Canvas>
                <Row className='px-8 pt-12 pb-10'>
                    <PageHeader
                        title='Fleet'
                        description='Every session across your projects, live. Sessions that need you surface first.'
                        actions={<span className='mono-label text-muted/70'>{connection === 'open' ? 'live' : 'reconnecting'}</span>}
                    />
                </Row>
                <Row className='px-8 py-4'>
                    <span className='mono-label text-muted/70'>
                        {sessions.length} session{sessions.length === 1 ? '' : 's'}{attention ? ` · ${attention} need input` : ''}
                    </span>
                </Row>
                <Row grow className='p-8'>
                    <FleetGrid sessions={sessions} />
                </Row>
            </Canvas>
        </AppShell>
    );
};

export default Dashboard;
