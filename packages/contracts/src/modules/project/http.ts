export interface CreateProjectInput{
    /**
     * @minLength 1
     * @maxLength 80
     */
    name: string;
    /** @maxLength 500 */
    description: string;
    /**
     * @maxItems 10
     */
    repoUrls?: string[];
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
    /** @maxLength 200 */
    baseImage?: string;
    /**
     * @minLength 1
     * @maxLength 40
     */
    defaultCli?: string;
}

export interface AddProjectRepositoryInput{
    /** @maxLength 500 */
    url: string;
}
