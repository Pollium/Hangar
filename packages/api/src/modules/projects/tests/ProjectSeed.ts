import Seed from '@tests/Seed';
import Project from '../models/Project';
import type User from '@/modules/user/models/User';

export default class ProjectSeed extends Seed{
    project(owner: User, overrides: Partial<Project> = {}): Promise<Project>{
        return Project.create({
            ownerId: owner.id,
            name: `Project ${owner.id}`,
            description: '',
            repoUrl: null,
            baseImage: 'cloud-code/sandbox-base:ubuntu',
            defaultCli: 'claude-code',
            ...overrides
        }).save();
    }
}

export const projectSeed = new ProjectSeed();
