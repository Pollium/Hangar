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
        return `cc-project-${projectId}`;
    }

    volumeName(projectId: number): string{
        return `cc-project-${projectId}`;
    }

    async provision(project: Project, sandbox: Sandbox): Promise<ContainerHandle>{
        await this.#docker.ensureNetwork(config.docker.network);
        await this.#docker.ensureVolume(sandbox.volumeName);

        if(!(await this.#docker.imageExists(project.baseImage))){
            await this.#docker.pull(project.baseImage);
        }

        const handle = await this.#docker.create({
            image: project.baseImage,
            name: this.containerName(project.id),
            env: [],
            labels: {
                'cloud-code.projectId': String(project.id),
                'cloud-code.owner': String(project.ownerId)
            },
            workdir: '/workspace',
            volumeName: sandbox.volumeName,
            limits: sandbox.limits,
            network: config.docker.network,
            // Keeper: stays alive so the container survives with no session attached.
            keeperCommand: ['tail', '-f', '/dev/null']
        });

        await handle.start();
        await this.#cloneRepo(handle, project);
        return handle;
    }

    async #cloneRepo(handle: ContainerHandle, project: Project): Promise<void>{
        if(!project.repoUrl) return;
        try{
            // Clone into /workspace only when empty. Credentials for private repos are injected
            // at session start (credentials module), never persisted into the volume in clear.
            const script = `test -z "$(ls -A /workspace 2>/dev/null)" && git clone ${project.repoUrl} /workspace || true`;
            await handle.exec(['bash', '-lc', script], { cwd: '/workspace' });
        }catch(error){
            logger.error('sandbox repo clone failed', error, { scope: 'sandbox.clone', projectId: project.id });
        }
    }
}
