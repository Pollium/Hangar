export interface CreateProjectInput{
    /**
     * @minLength 1
     * @maxLength 80
     */
    name: string;
    /** @maxLength 500 */
    description: string;
    /** @maxLength 500 */
    repoUrl?: string;
    /** @maxLength 200 */
    baseImage?: string;
    /**
     * @minLength 1
     * @maxLength 40
     */
    defaultCli: string;
}

export interface UpdateProjectInput{
    /**
     * @minLength 1
     * @maxLength 80
     */
    name?: string;
    /** @maxLength 500 */
    description?: string;
    /** @maxLength 500 */
    repoUrl?: string | null;
    /** @maxLength 200 */
    baseImage?: string;
    /**
     * @minLength 1
     * @maxLength 40
     */
    defaultCli?: string;
}
