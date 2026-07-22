/** Body for cloning a repository into the project's workspace. */
export interface CloneRepoInput{
    /** Clone URL (https). For private repos the sandbox authenticates via the owner's GITHUB_TOKEN. */
    url: string;
}
