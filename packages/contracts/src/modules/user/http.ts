// Only the fields the API actually honors: fullName is immutable and email changes
// would need re-verification — neither is patchable through this route.
export interface UpdateProfileInput{
    /**
     * @minLength 3
     * @maxLength 32
     */
    username?: string;
    bio?: string;
}

export interface ChangePasswordInput{
    currentPassword: string;
    /** @minLength 8 */
    newPassword: string;
}
