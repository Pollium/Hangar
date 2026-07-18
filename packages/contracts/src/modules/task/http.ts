export interface CreateScheduledTaskInput{
    projectId: number;
    /**
     * @minLength 1
     * @maxLength 120
     */
    title: string;
    /**
     * @minLength 1
     * @maxLength 40
     */
    cliType: string;
    /**
     * @minLength 1
     * @maxLength 4000
     */
    prompt: string;
    /**
     * @minLength 9
     * @maxLength 40
     */
    cron: string;
}

export interface UpdateScheduledTaskInput{
    /** @maxLength 120 */
    title?: string;
    /** @maxLength 4000 */
    prompt?: string;
    /** @maxLength 40 */
    cron?: string;
    enabled?: boolean;
}
