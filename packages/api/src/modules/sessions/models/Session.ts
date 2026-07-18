import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import BaseModel from '@/shared/models/BaseModel';
import Project from '@/modules/projects/models/Project';
import type { SessionStatus } from '@cloud-code/contracts/modules/session/domain';

@Entity()
export default class Session extends BaseModel{
    @Index()
    @Column('integer')
    projectId!: number;

    @ManyToOne(() => Project, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'projectId' })
    project!: Project;

    @Index()
    @Column('integer')
    ownerId!: number;

    @Column('varchar')
    title!: string;

    @Column('varchar')
    cliType!: string;

    @Column('varchar')
    status!: SessionStatus;

    @Column({ type: 'varchar', nullable: true })
    containerId!: string | null;

    @Column({ type: 'varchar', nullable: true })
    tmuxWindow!: string | null;

    @Column('varchar')
    cwd!: string;

    @Column({ type: 'datetime', nullable: true })
    lastActiveAt!: Date | null;
}
