import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseModel from '@/shared/models/BaseModel';
import User from '@/modules/user/models/User';
import type { ProjectProfile } from '@cloud-code/contracts/modules/project/domain';

@Entity()
export default class Project extends BaseModel implements ProjectProfile{
    @Column('varchar')
    name!: string;

    @Column('text')
    description!: string;

    @Column({ type: 'varchar', nullable: true })
    repoUrl!: string | null;

    @Column('varchar')
    baseImage!: string;

    @Column('varchar')
    defaultCli!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ownerId' })
    owner!: User;

    @Column('integer')
    ownerId!: number;
}
