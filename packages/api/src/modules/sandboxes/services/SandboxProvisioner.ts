import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';
import DockerService from '@/shared/services/docker/DockerService';
import type ContainerHandle from '@/shared/services/docker/ContainerHandle';
import type Project from '@/modules/projects/models/Project';
import type Sandbox from '../models/Sandbox';

/**
 * Turns a Sandbox row into a live, hardened container: ensures the network/volume/image
 * exist, creates and starts the container, and clones the project repo on first boot.
 * The container runs a keeper process so it stays up with no active session (24/7).
 */
export default class SandboxProvisioner{
    readonly #docker: DockerService;

    constructor(docker: DockerService){
        this.#docker = docker;
    }

    containerName(projectId: number): string{
        return `cc-${config.docker.namespace}-project-${projectId}`;
    }

    volumeName(projectId: number): string{
        return `cc-${config.docker.namespace}-project-${projectId}`;
    }

    async provision(project: Project, sandbox: Sandbox): Promise<ContainerHandle>{
        const labels = {
            'cloud-code.instanceId': config.docker.namespace,
            'cloud-code.projectId': String(project.id),
            'cloud-code.owner': String(project.ownerId)
        };

        await this.#docker.ensureNetwork(config.docker.network);
        await this.#docker.ensureVolume(sandbox.volumeName, labels);

        if(!(await this.#docker.imageExists(project.baseImage))){
            await this.#docker.pull(project.baseImage);
        }

        // A crash after Docker create but before the DB save can leave an orphan. Re-adopt it
        // only when the complete identity and workspace mount both match.
        const [owned] = await this.#docker.list(labels);
        if(owned){
            const mountedVolume = await owned.volumeAt('/workspace');
            if(mountedVolume === sandbox.volumeName){
                if(!(await owned.isRunning())) await owned.start();
                await this.#cloneRepo(owned, project);
                return owned;
            }

            logger.warn('discarding sandbox container with mismatched workspace mount', {
                scope: 'sandbox.reconcile',
                projectId: project.id,
                containerId: owned.id,
                expectedVolume: sandbox.volumeName,
                mountedVolume
            });
            await owned.remove(false);
        }

        let created: ContainerHandle | null = null;
        try{
            created = await this.#docker.create({
                image: project.baseImage,
                name: this.containerName(project.id),
                env: [],
                labels,
                workdir: '/workspace',
                volumeName: sandbox.volumeName,
                limits: sandbox.limits,
                network: config.docker.network,
                // Keeper: stays alive so the container survives with no session attached.
                keeperCommand: ['tail', '-f', '/dev/null']
            });

            await created.start();
            await this.#cloneRepo(created, project);
            return created;
        }catch(error){
            // Never leave a newly-created name reserved when start/provisioning fails. Keep the
            // namespaced volume so a retry preserves this project's workspace.
            if(created){
                try{
                    await created.remove(false);
                }catch(rollbackError){
                    logger.error('sandbox container rollback failed', rollbackError, {
                        scope: 'sandbox.rollback',
                        projectId: project.id,
                        containerId: created.id
                    });
                }
            }
            throw error;
        }
    }

    async #cloneRepo(handle: ContainerHandle, project: Project): Promise<void>{
        if(!project.repoUrl) return;
        try{
            // Clone into /workspace only when empty. Session environment variables are not
            // available at provisioning time and are never persisted into the volume.
            const script = `test -z "$(ls -A /workspace 2>/dev/null)" && git clone ${project.repoUrl} /workspace || true`;
            await handle.exec(['bash', '-lc', script], { cwd: '/workspace' });
        }catch(error){
            logger.error('sandbox repo clone failed', error, { scope: 'sandbox.clone', projectId: project.id });
        }
    }
}
