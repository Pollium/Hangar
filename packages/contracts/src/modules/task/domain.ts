import type { BaseEntity } from '../../shared/base';

export interface ScheduledTaskProfile{
    title: string;
    cliType: string;
    prompt: string;
    /** Standard 5-field cron expression, evaluated server-side. */
    cron: string;
    enabled: boolean;
}

export interface ScheduledTask extends ScheduledTaskProfile, BaseEntity{
    projectId: number;
    ownerId: number;
    lastRunAt: string | null;
}
