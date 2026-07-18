export interface CreateSessionInput{
    projectId: number;
    /**
     * @minLength 1
     * @maxLength 40
     */
    cliType: string;
    /** @maxLength 120 */
    title?: string;
}
