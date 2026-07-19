import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import BaseModel from '@/shared/models/BaseModel';
import Project from './Project';
import User from '@/modules/user/models/User';

@Entity()
@Index(['projectId', 'userId'], { unique: true })
export default class ProjectMember extends BaseModel{
    @Index()
    @Column('integer')
    projectId!: number;

    @ManyToOne(() => Project, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'projectId' })
    project!: Project;

    @Index()
    @Column('integer')
    userId!: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: User;
}
