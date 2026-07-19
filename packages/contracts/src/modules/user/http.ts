// Email changes would need re-verification, so that field stays out of this route.
export interface UpdateProfileInput{
    /** @maxLength 120 */
    fullName?: string;
    /**
     * @minLength 3
     * @maxLength 32
     */
    username?: string;
    /** @maxLength 500 */
    bio?: string;
    /**
     * A small square avatar as a data URL — the web client downscales the dropped
     * image to ~256px before sending, so the payload stays well under the body
     * limit. Pass null to clear it.
     * @maxLength 700000
     */
    avatarUrl?: string | null;
}

export interface ChangePasswordInput{
    currentPassword: string;
    /** @minLength 8 */
    newPassword: string;
}
