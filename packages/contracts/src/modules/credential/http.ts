export interface CreateCredentialInput{
    /**
     * Environment variable name. Names are case-sensitive and must be valid for a process
     * environment (letters/underscore first, then letters, numbers or underscores).
     * @minLength 1
     * @maxLength 80
     * @pattern ^[A-Za-z_][A-Za-z0-9_]*$
     */
    name: string;
    /** @minLength 1 */
    value: string;
}
