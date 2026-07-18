import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import BaseModel from '@/shared/models/BaseModel';
import Project from '@/modules/projects/models/Project';
import type { SandboxStatus, ResourceLimits } from '@cloud-code/contracts/modules/sandbox/domain';

@Entity()
export default class Sandbox extends BaseModel{
    @Index({ unique: true })
    @Column('integer')
    projectId!: number;

    @ManyToOne(() => Project, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'projectId' })
    project!: Project;

    @Column('integer')
    ownerId!: number;

    @Column({ type: 'varchar', nullable: true })
    containerId!: string | null;

    @Column('varchar')
    volumeName!: string;

    @Column('varchar')
    status!: SandboxStatus;

    @Column('simple-json')
    limits!: ResourceLimits;

    @Column({ type: 'datetime', nullable: true })
    lastStartedAt!: Date | null;
}
