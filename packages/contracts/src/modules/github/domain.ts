/** A repository the connected GitHub user can clone (own, collaborator, or org member). */
export interface GithubRepo{
    fullName: string;
    cloneUrl: string;
    private: boolean;
    description: string | null;
}
