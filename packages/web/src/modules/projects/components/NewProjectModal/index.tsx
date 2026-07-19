import { Modal } from '@heroui/react';
import { ProjectForm } from '@/modules/projects/components/ProjectForm';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';
import { useNewProjectModalStore } from '@/modules/projects/store/newProjectModal';
import type { Project } from '@hangar/contracts/modules/project/domain';

export const NewProjectModal = () => {
    const isOpen = useNewProjectModalStore((state) => state.isOpen);
    const close = useNewProjectModalStore((state) => state.close);
    const { refresh } = useProjects();
    const setActiveProject = useActiveProjectStore((state) => state.setActiveProject);

    const created = (project: Project) => {
        refresh();
        setActiveProject(project.id);
        close();
    };

    return (
        <Modal.Root isOpen={isOpen} onOpenChange={(open) => (open ? undefined : close())}>
            <Modal.Backdrop>
                <Modal.Container>
                    <Modal.Dialog>
                        <Modal.Header>
                            <Modal.Heading>New project</Modal.Heading>
                            <Modal.CloseTrigger />
                        </Modal.Header>
                        <Modal.Body>
                            <ProjectForm onCreated={created} />
                        </Modal.Body>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal.Root>
    );
};
