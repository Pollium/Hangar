import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import BaseModel from '@/shared/models/BaseModel';
import Session from './Session';
import type { SessionEventKind } from '@cloud-code/contracts/modules/session/domain';

/** Persisted transcript chunk, used to replay a session's screen on reconnect. */
@Entity()
export default class SessionEvent extends BaseModel{
    @Index()
    @Column('integer')
    sessionId!: number;

    @ManyToOne(() => Session, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sessionId' })
    session!: Session;

    @Column('varchar')
    kind!: SessionEventKind;

    @Column('text')
    data!: string;
}
