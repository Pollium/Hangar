import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import BaseModel from '@/shared/models/BaseModel';
import Project from './Project';

@Entity()
export default class ProjectRepository extends BaseModel{
    @Index()
    @Column('integer')
    projectId!: number;

    @ManyToOne(() => Project, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'projectId' })
    project!: Project;

    @Column('varchar')
    url!: string;
}
