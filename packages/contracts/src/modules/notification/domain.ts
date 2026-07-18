import type { BaseEntity } from '../../shared/base';

export type NotificationType = 'needs_input' | 'idle';

export interface Notification extends BaseEntity{
    ownerId: number;
    type: NotificationType;
    sessionId: number;
    message: string;
    readAt: string | null;
}
