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

export interface UpdateSessionCliInput{
    /**
     * @minLength 1
     * @maxLength 40
     */
    cliType: string;
}
