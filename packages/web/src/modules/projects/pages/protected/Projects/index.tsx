import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '@heroui/react';
import { AppShell } from '@/modules/sessions/components/AppShell';
import { Canvas, Row } from '@/shared/components/ui/Blueprint';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { ProjectForm } from '@/modules/projects/components/ProjectForm';
import { ProjectList } from '@/modules/projects/components/ProjectList';

const ProjectsPage = () => {
    const { projects, refresh } = useProjects();
    const [open, setOpen] = useState(false);

    return (
        <AppShell title='Projects'>
            <Canvas>
                <Row className='px-8 pt-12 pb-10'>
                    <PageHeader
                        title='Projects'
                        description='A project is a repo and its hardened sandbox. Sessions run inside it.'
                        actions={(
                            <button
                                type='button'
                                onClick={() => setOpen(true)}
                                className='inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover'
                            >
                                <Plus className='size-3.5' aria-hidden='true' />
                                New project
                            </button>
                        )}
                    />
                </Row>
                <Row className='px-8 py-4'>
                    <span className='mono-label text-muted/70'>{projects.length} project{projects.length === 1 ? '' : 's'}</span>
                </Row>
                <Row grow className='p-8'>
                    <ProjectList projects={projects} onChanged={refresh} />
                </Row>
            </Canvas>

            <Modal.Root isOpen={open} onOpenChange={setOpen}>
                <Modal.Backdrop>
                    <Modal.Container>
                        <Modal.Dialog>
                            <Modal.Header>
                                <Modal.Heading>New project</Modal.Heading>
                                <Modal.CloseTrigger />
                            </Modal.Header>
                            <Modal.Body>
                                <ProjectForm onCreated={() => { refresh(); setOpen(false); }} />
                            </Modal.Body>
                        </Modal.Dialog>
                    </Modal.Container>
                </Modal.Backdrop>
            </Modal.Root>
        </AppShell>
    );
};

export default ProjectsPage;
