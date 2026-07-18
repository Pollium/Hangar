import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';

// Placeholder landing for authenticated users. The session sidebar replaces this in phase 17.
const Home = () => (
    <DashboardLayout>
        <div className='flex h-full items-center justify-center'>
            <p className='text-sm text-muted'>No sessions yet. Create one to get started.</p>
        </div>
    </DashboardLayout>
);

export default Home;
