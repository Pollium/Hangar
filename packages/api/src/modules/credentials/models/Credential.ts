import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseModel from '@/shared/models/BaseModel';
import { Hidden } from '@/shared/models/Hidden';
import User from '@/modules/user/models/User';

@Entity()
export default class Credential extends BaseModel{
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ownerId' })
    owner!: User;

    @Column('integer')
    ownerId!: number;

    @Column('varchar')
    provider!: string;

    @Column('varchar')
    label!: string;

    @Column('varchar')
    envVar!: string;

    // AES-256-GCM ciphertext (SecretCipher). Never serialized to the client.
    @Hidden()
    @Column('text')
    ciphertext!: string;
}
