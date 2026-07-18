import { AppShell } from '@/modules/sessions/components/AppShell';
import { Canvas, Row } from '@/shared/components/ui/Blueprint';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { ProjectForm } from '@/modules/projects/components/ProjectForm';
import { ProjectList } from '@/modules/projects/components/ProjectList';

const ProjectsPage = () => {
    const { projects, refresh } = useProjects();

    return (
        <AppShell title='Projects'>
            <Canvas>
                <Row className='px-8 pt-12 pb-10'>
                    <PageHeader title='Projects' description='A project is a repo and its hardened sandbox. Sessions run inside it.' />
                </Row>
                <Row className='p-8'>
                    <ProjectForm onCreated={refresh} />
                </Row>
                <Row className='px-8 py-4'>
                    <span className='mono-label text-muted/70'>{projects.length} project{projects.length === 1 ? '' : 's'}</span>
                </Row>
                <Row grow className='p-8'>
                    <ProjectList projects={projects} onChanged={refresh} />
                </Row>
            </Canvas>
        </AppShell>
    );
};

export default ProjectsPage;
