/** A user-published container port, reachable publicly through the tunnel proxy at `url`. */
export interface PublishedAppView{
    id: number;
    projectId: number;
    /** Port the app listens on inside the project's sandbox container. */
    port: number;
    /** Unguessable subdomain label — the capability that gates public access. */
    slug: string;
    label: string | null;
    /** Full public URL, e.g. `https://<slug>.preview.example.com`. */
    url: string;
}
