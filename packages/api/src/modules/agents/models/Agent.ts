import { Entity, Column } from 'typeorm';
import BaseModel from '@/shared/models/BaseModel';
import { Hidden } from '@/shared/models/Hidden';

/** A user's compute host (their VPS). The running agent authenticates with a token whose hash is
 *  stored here; liveness (online/offline) is derived from the in-process AgentRegistry, not a column. */
@Entity()
export default class Agent extends BaseModel{
    @Column('integer')
    ownerId!: number;

    @Column('varchar')
    name!: string;

    @Column('varchar')
    @Hidden()
    tokenHash!: string;

    @Column({ type: 'datetime', nullable: true })
    lastSeenAt!: Date | null;
}
