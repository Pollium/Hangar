import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';
import ProjectRepository from '@/modules/projects/models/ProjectRepository';
import type { IDockerService, IContainerHandle } from '@/shared/services/docker/contracts';
import type Project from '@/modules/projects/models/Project';
import type Sandbox from '../models/Sandbox';

/**
 * Turns a Sandbox row into a live, hardened container ON THE PROJECT OWNER'S AGENT: ensures the
 * network/volume/image exist, creates and starts the container, and clones the project repo on
 * first boot. The container runs a keeper process so it stays up with no active session (24/7).
 */
export default class SandboxProvisioner{
    containerName(projectId: number): string{
        return `hangar-${config.docker.namespace}-project-${projectId}`;
    }

    volumeName(projectId: number): string{
        return `hangar-${config.docker.namespace}-project-${projectId}`;
    }

    async provision(project: Project, sandbox: Sandbox, docker: IDockerService): Promise<IContainerHandle>{
        const labels = {
            'hangar.instanceId': config.docker.namespace,
            'hangar.projectId': String(project.id),
            'hangar.owner': String(project.ownerId)
        };

        await docker.ensureNetwork(config.docker.network);
        await docker.ensureVolume(sandbox.volumeName, labels);

        if(!(await docker.imageExists(project.baseImage))){
            await docker.pull(project.baseImage);
        }

        // A crash after Docker create but before the DB save can leave an orphan. Re-adopt it
        // only when the complete identity and workspace mount both match.
        const [owned] = await docker.list(labels);
        if(owned){
            const mountedVolume = await owned.volumeAt('/workspace');
            if(mountedVolume === sandbox.volumeName){
                if(!(await owned.isRunning())) await owned.start();
                await this.#cloneRepositories(owned, project);
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

        let created: IContainerHandle | null = null;
        try{
            created = await docker.create({
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
            await this.#cloneRepositories(created, project);
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

    /**
     * Clones every attached repo into its own /workspace subdirectory, skipping any that
     * already exist. Runs `git` as a plain argv command (no shell) so a repo URL can never
     * be interpreted as shell syntax. Session environment variables are not available at
     * provisioning time and are never persisted into the volume.
     */
    async #cloneRepositories(handle: IContainerHandle, project: Project): Promise<void>{
        const repos = await ProjectRepository.findBy({ projectId: project.id });
        for(const repo of repos){
            const dest = `/workspace/${this.#repoSlug(repo.url)}`;
            try{
                const existing = await handle.exec(['test', '-e', dest]);
                if(existing.exitCode === 0) continue;
                await handle.exec(['git', 'clone', repo.url, dest], { cwd: '/workspace' });
            }catch(error){
                logger.error('sandbox repo clone failed', error, {
                    scope: 'sandbox.clone',
                    projectId: project.id,
                    repositoryId: repo.id
                });
            }
        }
    }

    #repoSlug(url: string): string{
        const trimmed = url.replace(/\.git$/i, '').replace(/\/+$/, '');
        const last = trimmed.split('/').pop() || '';
        const safe = last.replace(/[^a-zA-Z0-9._-]/g, '-');
        return safe && safe !== '.' && safe !== '..' ? safe : 'repo';
    }
}
