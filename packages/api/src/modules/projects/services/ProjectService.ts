import { config } from '@/shared/config';
import Project from '../models/Project';
import { ProjectError } from '../contracts/domain/errors';
import type { CreateProjectInput, UpdateProjectInput } from '@cloud-code/contracts/modules/project/http';

export default class ProjectService{
    create(userId: number, input: CreateProjectInput): Promise<Project>{
        return Project.create({
            ownerId: userId,
            name: input.name,
            description: input.description,
            repoUrl: input.repoUrl ?? null,
            baseImage: input.baseImage || config.docker.baseImage,
            defaultCli: input.defaultCli
        }).save();
    }

    list(userId: number): Promise<Project[]>{
        return Project.findBy({ ownerId: userId });
    }

    async get(userId: number, projectId: number): Promise<Project>{
        const project = await Project.findOneBy({ id: projectId });
        if(!project) throw ProjectError.NotFound();
        if(project.ownerId !== userId) throw ProjectError.Forbidden();
        return project;
    }

    async update(userId: number, projectId: number, patch: UpdateProjectInput): Promise<Project>{
        const project = await this.get(userId, projectId);
        return Object.assign(project, patch).save();
    }

    async remove(userId: number, projectId: number): Promise<void>{
        const project = await this.get(userId, projectId);
        await project.remove();
    }
}
