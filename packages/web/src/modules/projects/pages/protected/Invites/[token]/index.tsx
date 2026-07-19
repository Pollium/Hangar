import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { projectApi } from '@/modules/projects/api/api';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';

const InvitePage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const setActiveProject = useActiveProjectStore((state) => state.setActiveProject);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if(!token) return;
        projectApi.joinInvite(token)
            .then((project) => {
                setActiveProject(project.id);
                // Hard navigation: guarantees every guard/hook on the next page starts from a
                // clean fetch instead of racing a stale in-memory cache right after joining.
                window.location.href = '/';
            })
            .catch(() => setError('This invite link is invalid or has been regenerated.'));
    }, [token, setActiveProject]);

    if(error){
        return (
            <div className='flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-4 text-center text-foreground'>
                <p className='text-sm text-danger'>{error}</p>
                <button
                    type='button'
                    onClick={() => navigate('/')}
                    className='rounded-lg border border-hairline px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/[0.04]'
                >
                    Back to Hangar
                </button>
            </div>
        );
    }

    return (
        <div className='flex min-h-dvh items-center justify-center bg-background'>
            <LoaderCircle className='size-6 animate-spin text-muted' aria-label='Joining project' />
        </div>
    );
};

export default InvitePage;
