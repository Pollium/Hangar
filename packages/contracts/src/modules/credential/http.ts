export interface CreateCredentialInput{
    /**
     * @minLength 1
     * @maxLength 40
     */
    provider: string;
    /**
     * @minLength 1
     * @maxLength 80
     */
    label: string;
    /**
     * @minLength 1
     * @maxLength 80
     * @pattern ^[A-Z][A-Z0-9_]*$
     */
    envVar: string;
    /** @minLength 1 */
    secret: string;
}
