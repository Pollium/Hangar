import { Entity, Column } from 'typeorm';
import BaseModel from '@/shared/models/BaseModel';
import { Hidden } from '@/shared/models/Hidden';
import { UserFields } from '../contracts/domain/user';

@Entity()
export default class User extends BaseModel implements UserFields{
    @Column('varchar')
    fullName!: string;

    @Column({ type: 'varchar', unique: true })
    username!: string;

    @Column({ type: 'varchar', unique: true })
    email!: string;

    @Column('text')
    bio!: string;

    @Column({ type: 'varchar', nullable: true })
    @Hidden()
    passwordHash!: string | null;

    @Column({ type: 'varchar', nullable: true })
    avatarUrl!: string | null;
}
