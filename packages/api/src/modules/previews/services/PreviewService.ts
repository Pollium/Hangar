import { randomBytes } from 'node:crypto';
import { config } from '@/shared/config';
import ProjectService from '@/modules/projects/services/ProjectService';
import Sandbox from '@/modules/sandboxes/models/Sandbox';
import { codeServerPort } from '@/modules/codespaces/services/CodespaceService';
import PublishedApp from '../models/PublishedApp';
import { PreviewError } from '../contracts/domain/errors';
import type { PublishedAppView } from '@hangar/contracts/modules/preview/domain';

// DNS-label alphabet: lowercase letters + digits. Slugs start with a letter (some resolvers reject
// all-digit / leading-digit labels). 12 chars over 36 symbols ≈ 62 bits — not enumerable.
const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SLUG_LENGTH = 12;

/** The tunnel target for a published slug: which agent, container, and port to reach. */
export interface PreviewTarget{
    ownerId: number;
    containerId: string;
    port: number;
}

/**
 * Publishes container ports for public access. An app runs inside the project's sandbox container
 * on the owner's agent; the preview proxy relays to it over the tunnel. Publishing only records the
 * (project, port) → slug mapping — the slug is the unguessable capability that gates access.
 */
export default class PreviewService{
    #projects = new ProjectService();

    async list(userId: number, projectId: number): Promise<PublishedAppView[]>{
        await this.#projects.get(userId, projectId);
        const apps = await PublishedApp.findBy({ projectId });
        return apps.map((app) => this.#view(app));
    }

    async publish(userId: number, projectId: number, port: number, label?: string): Promise<PublishedAppView>{
        await this.#projects.get(userId, projectId);
        if(!Number.isInteger(port) || port < 1 || port > 65535) throw PreviewError.InvalidPort();
        // Never expose the project's editor through a public URL.
        if(port === codeServerPort(projectId)) throw PreviewError.PortReserved();

        const app = PublishedApp.create({
            projectId,
            port,
            slug: await this.#uniqueSlug(),
            label: label?.trim() || null,
            createdBy: userId
        });
        await app.save();
        return this.#view(app);
    }

    async unpublish(userId: number, slug: string): Promise<void>{
        const app = await PublishedApp.findOneBy({ slug });
        if(!app) throw PreviewError.NotFound();
        await this.#projects.get(userId, app.projectId);
        await app.remove();
    }

    /** Resolve a slug to its live tunnel target. Null when unknown or the sandbox is not up. */
    async resolve(slug: string): Promise<PreviewTarget | null>{
        const app = await PublishedApp.findOneBy({ slug });
        if(!app) return null;
        const sandbox = await Sandbox.findOneBy({ projectId: app.projectId });
        if(!sandbox?.containerId) return null;
        return { ownerId: sandbox.ownerId, containerId: sandbox.containerId, port: app.port };
    }

    #view(app: PublishedApp): PublishedAppView{
        return { id: app.id, projectId: app.projectId, port: app.port, slug: app.slug, label: app.label, url: this.#url(app.slug) };
    }

    #url(slug: string): string{
        const { scheme, domain, port } = config.preview;
        return `${scheme}://${slug}.${domain}${port ? `:${port}` : ''}`;
    }

    async #uniqueSlug(): Promise<string>{
        for(let attempt = 0; attempt < 5; attempt += 1){
            const slug = this.#randomSlug();
            if(!(await PublishedApp.findOneBy({ slug }))) return slug;
        }
        throw PreviewError.NotFound();
    }

    #randomSlug(): string{
        const bytes = randomBytes(SLUG_LENGTH);
        let slug = '';
        for(let i = 0; i < SLUG_LENGTH; i += 1) slug += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
        return /^[a-z]/.test(slug) ? slug : `a${slug.slice(1)}`;
    }
}
