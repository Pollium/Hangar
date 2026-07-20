import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import BaseModel from '@/shared/models/BaseModel';
import Project from '@/modules/projects/models/Project';

/** A container port the user exposed publicly. `slug` is the unguessable subdomain capability. */
@Entity()
export default class PublishedApp extends BaseModel{
    @Index()
    @Column('integer')
    projectId!: number;

    @ManyToOne(() => Project, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'projectId' })
    project!: Project;

    @Column('integer')
    port!: number;

    @Index({ unique: true })
    @Column('varchar')
    slug!: string;

    @Column({ type: 'varchar', nullable: true })
    label!: string | null;

    @Column('integer')
    createdBy!: number;
}
