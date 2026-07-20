import { Plus } from 'lucide-react';
import { AppShell } from '@/modules/sessions/components/AppShell';
import { Canvas, Row } from '@/shared/components/ui/Blueprint';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { ProjectList } from '@/modules/projects/components/ProjectList';
import { useNewProjectModalStore } from '@/modules/projects/store/newProjectModal';

const ProjectsPage = () => {
    const { projects, refresh } = useProjects();
    const openNewProject = useNewProjectModalStore((state) => state.open);

    return (
        <AppShell>
            <Canvas>
                <Row>
                    <PageHeader
                        title='Projects'
                        actions={(
                            <button
                                type='button'
                                onClick={openNewProject}
                                className='inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover'
                            >
                                <Plus className='size-3.5' aria-hidden='true' />
                                New project
                            </button>
                        )}
                    />
                </Row>
                <Row>
                    <span className='mono-label text-muted/70'>{projects.length} project{projects.length === 1 ? '' : 's'}</span>
                </Row>
                <Row grow>
                    <ProjectList projects={projects} onChanged={refresh} />
                </Row>
            </Canvas>
        </AppShell>
    );
};

export default ProjectsPage;
