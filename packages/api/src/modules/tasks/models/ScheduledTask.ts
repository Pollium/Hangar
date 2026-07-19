import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseModel from '@/shared/models/BaseModel';
import Project from '@/modules/projects/models/Project';
import type { ScheduledTaskProfile } from '@hangar/contracts/modules/task/domain';

@Entity()
export default class ScheduledTask extends BaseModel implements ScheduledTaskProfile{
    @Column('integer')
    projectId!: number;

    @ManyToOne(() => Project, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'projectId' })
    project!: Project;

    @Column('integer')
    ownerId!: number;

    @Column('varchar')
    title!: string;

    @Column('varchar')
    cliType!: string;

    @Column('text')
    prompt!: string;

    @Column('varchar')
    cron!: string;

    @Column('boolean')
    enabled!: boolean;

    @Column({ type: 'datetime', nullable: true })
    lastRunAt!: Date | null;
}
