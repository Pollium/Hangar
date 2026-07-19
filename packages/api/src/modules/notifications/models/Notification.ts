import { Entity, Column, Index } from 'typeorm';
import BaseModel from '@/shared/models/BaseModel';
import type { NotificationType } from '@hangar/contracts/modules/notification/domain';

@Entity()
export default class Notification extends BaseModel{
    @Index()
    @Column('integer')
    ownerId!: number;

    @Column('varchar')
    type!: NotificationType;

    @Column('integer')
    sessionId!: number;

    @Column('varchar')
    message!: string;

    @Column({ type: 'datetime', nullable: true })
    readAt!: Date | null;
}
