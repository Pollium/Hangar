import { AppShell } from '@/modules/sessions/components/AppShell';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { ProjectForm } from '@/modules/projects/components/ProjectForm';
import { ProjectList } from '@/modules/projects/components/ProjectList';

const ProjectsPage = () => {
    const { projects, refresh } = useProjects();

    return (
        <AppShell>
            <div className='mx-auto flex w-full max-w-2xl flex-col gap-6 overflow-y-auto p-8'>
                <h1 className='text-lg font-semibold text-foreground'>Projects</h1>
                <ProjectForm onCreated={refresh} />
                <ProjectList projects={projects} onChanged={refresh} />
            </div>
        </AppShell>
    );
};

export default ProjectsPage;
