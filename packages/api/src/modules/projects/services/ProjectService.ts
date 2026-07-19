import { randomBytes } from 'node:crypto';
import { config } from '@/shared/config';
import Project from '../models/Project';
import ProjectMember from '../models/ProjectMember';
import ProjectRepository from '../models/ProjectRepository';
import { ProjectError } from '../contracts/domain/errors';
import type {
    AddProjectRepositoryInput,
    CreateProjectInput,
    UpdateProjectInput
} from '@cloud-code/contracts/modules/project/http';

const generateInviteToken = (): string => randomBytes(24).toString('base64url');

export default class ProjectService{
    async create(userId: number, input: CreateProjectInput): Promise<Project>{
        const project = await Project.create({
            ownerId: userId,
            name: input.name,
            description: input.description,
            inviteToken: generateInviteToken(),
            baseImage: input.baseImage || config.docker.baseImage,
            defaultCli: input.defaultCli
        }).save() as Project;

        await ProjectMember.create({ projectId: project.id, userId }).save();
        for(const url of input.repoUrls ?? []){
            await ProjectRepository.create({ projectId: project.id, url }).save();
        }
        return project;
    }

    async list(userId: number): Promise<Project[]>{
        const memberships = await ProjectMember.findBy({ userId });
        if(memberships.length === 0) return [];
        return Project.createQueryBuilder('project')
            .where('project.id IN (:...ids)', { ids: memberships.map((member) => member.projectId) })
            .getMany();
    }

    async isMember(userId: number, projectId: number): Promise<boolean>{
        return (await ProjectMember.findOneBy({ userId, projectId })) !== null;
    }

    async get(userId: number, projectId: number): Promise<Project>{
        const project = await Project.findOneBy({ id: projectId });
        if(!project) throw ProjectError.NotFound();
        if(!(await this.isMember(userId, projectId))) throw ProjectError.Forbidden();
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

    async rotateInvite(userId: number, projectId: number): Promise<Project>{
        const project = await this.get(userId, projectId);
        project.inviteToken = generateInviteToken();
        return project.save() as Promise<Project>;
    }

    async joinByInvite(userId: number, token: string): Promise<Project>{
        const project = await Project.findOneBy({ inviteToken: token });
        if(!project) throw ProjectError.InvalidInvite();
        const already = await this.isMember(userId, project.id);
        if(!already) await ProjectMember.create({ projectId: project.id, userId }).save();
        return project;
    }

    async addRepository(userId: number, projectId: number, input: AddProjectRepositoryInput): Promise<ProjectRepository>{
        await this.get(userId, projectId);
        return ProjectRepository.create({ projectId, url: input.url }).save() as Promise<ProjectRepository>;
    }

    async removeRepository(userId: number, projectId: number, repoId: number): Promise<void>{
        await this.get(userId, projectId);
        await ProjectRepository.delete({ id: repoId, projectId });
    }

    async listRepositories(userId: number, projectId: number): Promise<ProjectRepository[]>{
        await this.get(userId, projectId);
        return ProjectRepository.findBy({ projectId });
    }
}
