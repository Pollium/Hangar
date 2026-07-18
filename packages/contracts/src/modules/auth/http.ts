export interface CheckEmailInput{
    /** @format email */
    email: string;
}

export interface SignInInput{
    /** @format email */
    email: string;
    /** @minLength 8 */
    password: string;
}

export interface SignUpInput{
    /**
     * @minLength 1
     * @maxLength 80
     */
    fullName: string;
    /** @format email */
    email: string;
    /**
     * @minLength 3
     * @maxLength 32
     */
    username: string;
    /** @minLength 8 */
    password: string;
}
