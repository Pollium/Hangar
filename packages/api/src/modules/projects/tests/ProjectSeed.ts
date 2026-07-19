import { randomBytes } from 'node:crypto';
import Seed from '@tests/Seed';
import Project from '../models/Project';
import ProjectMember from '../models/ProjectMember';
import type User from '@/modules/user/models/User';

export default class ProjectSeed extends Seed{
    async project(owner: User, overrides: Partial<Project> = {}): Promise<Project>{
        const entity = Project.create({
            ownerId: owner.id,
            name: `Project ${owner.id}`,
            description: '',
            inviteToken: randomBytes(24).toString('base64url'),
            baseImage: 'hangar/sandbox-base:ubuntu',
            defaultCli: 'claude-code',
            ...overrides
        });
        const saved = await entity.save() as Project;
        await ProjectMember.create({ projectId: saved.id, userId: owner.id }).save();
        return saved;
    }
}

export const projectSeed = new ProjectSeed();
