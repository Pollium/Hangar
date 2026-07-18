import { Link } from 'react-router-dom';
import { ArrowUpRight, TerminalSquare, FolderGit2, KeyRound } from 'lucide-react';
import { AppShell } from '@/modules/sessions/components/AppShell';
import { Canvas, Row } from '@/shared/components/ui/Blueprint';
import { PageHeader } from '@/shared/components/ui/PageHeader';

const ACTIONS = [
    { to: '/sessions/new', label: 'New session', description: 'Launch a coding agent in a sandbox.', icon: TerminalSquare },
    { to: '/projects', label: 'Projects', description: 'Repos and their sandboxes.', icon: FolderGit2 },
    { to: '/settings', label: 'Credentials', description: 'API keys and base URLs.', icon: KeyRound }
];

const Home = () => (
    <AppShell title='Overview'>
        <Canvas>
            <Row className='px-8 pt-12 pb-10' max='max-w-4xl'>
                <PageHeader
                    title='Overview'
                    description={<>Your agents, running on your own infrastructure. Pick a session from the sidebar or start a new one.</>}
                />
            </Row>

            <Row max='max-w-4xl'>
                <div className='grid grid-cols-1 gap-px bg-[var(--hairline)] sm:grid-cols-3'>
                    {ACTIONS.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link
                                key={action.to}
                                to={action.to}
                                className='group flex flex-col gap-3 bg-background px-6 py-5 transition-colors hover:bg-foreground/[0.02]'
                            >
                                <div className='flex items-start justify-between'>
                                    <Icon className='size-4 text-muted/70 transition-colors group-hover:text-accent' />
                                    <ArrowUpRight className='size-4 text-muted/40 transition-colors group-hover:text-accent' />
                                </div>
                                <div className='flex flex-col gap-1'>
                                    <span className='text-sm font-medium text-foreground'>{action.label}</span>
                                    <span className='text-xs text-muted'>{action.description}</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </Row>

            <Row grow max='max-w-4xl' />
        </Canvas>
    </AppShell>
);

export default Home;
