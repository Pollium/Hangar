import { createHash } from 'node:crypto';
import { ConfigError } from '@/shared/errors/ConfigError';

const required = (key: string): string => {
    const value = process.env[key];
    if(value === undefined || value === '') throw ConfigError.MissingEnv(key);
    return value;
};

const optional = (key: string): string | undefined => {
    const value = process.env[key];
    return value === undefined || value === '' ? undefined : value;
};

const jwtSecret = required('JWT_SECRET');
const encryptionKey = required('ENCRYPTION_KEY');
const databasePath = required('DATABASE_PATH');
const corsOrigin = optional('CORS_ORIGIN') ?? 'http://localhost:5173';
const port = Number(required('PORT'));

// Public preview proxy: user-published container ports are served under `*.<previewDomain>` and
// relayed through the owner's agent tunnel. Local runs use *.preview.localhost (loopback in the
// browser); the browser-visible edge port (e.g. 8200) is appended to built URLs via previewPort.
const previewDomain = optional('PREVIEW_DOMAIN') ?? 'preview.localhost';
const previewScheme = optional('PREVIEW_SCHEME') ?? (previewDomain.includes('localhost') ? 'http' : 'https');
const previewPort = optional('PREVIEW_PORT');

// Docker names are daemon-global, while project IDs are only database-local. Use a stable
// namespace per control plane so two databases sharing one daemon can never adopt each
// other's containers or volumes. Existing installs get a deterministic fallback.
const generatedNamespace = `instance-${createHash('sha256')
    .update(`${databasePath}\0${encryptionKey}`)
    .digest('hex')
    .slice(0, 12)}`;
const sandboxNamespace = optional('SANDBOX_NAMESPACE') ?? generatedNamespace;
if(!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,31}$/.test(sandboxNamespace)){
    throw ConfigError.InvalidSandboxNamespace(sandboxNamespace);
}

export const config = {
    jwtSecret,
    encryptionKey,
    port,
    databasePath,
    corsOrigin,
    // Base URL of the web app, used to build links (e.g. notification deep-links).
    webUrl: optional('WEB_URL') ?? corsOrigin,
    // Public base URL of this control-plane API — the address an agent on a user's VPS dials
    // back into. Falls back to WEB_URL for single-host local runs.
    publicApiUrl: optional('PUBLIC_API_URL') ?? optional('WEB_URL') ?? corsOrigin,
    // Published agent image referenced by the "Connect a VPS" install command. Kept in env (not
    // code) so the registry/name can change — e.g. after renaming the project — without a rebuild.
    agentImage: optional('AGENT_IMAGE') ?? 'ghcr.io/pollium/hangar-agent:latest',
    // Open registration. Set false on a personal VPS to run single-admin (see auth module).
    allowSignup: optional('ALLOW_SIGNUP') !== 'false',

    preview: {
        domain: previewDomain,
        scheme: previewScheme,
        port: previewPort
    },

    log: {
        level: optional('LOG_LEVEL') ?? 'info',
        pretty: optional('LOG_PRETTY') === 'true'
    },

    redis: {
        host: required('REDIS_HOST'),
        port: Number(required('REDIS_PORT'))
    },

    // Multipart cap kept small: this app does not do large uploads.
    storage: {
        maxUploadBytes: Number(optional('STORAGE_MAX_UPLOAD_BYTES') ?? 5_242_880)
    },

    docker: {
        socket: optional('DOCKER_SOCKET') ?? '/var/run/docker.sock',
        namespace: sandboxNamespace,
        baseImage: optional('SANDBOX_BASE_IMAGE') ?? 'hangar/sandbox-base:ubuntu',
        network: optional('SANDBOX_NETWORK') ?? `hangar-${sandboxNamespace}-sandboxes`,
        // Per-sandbox resource ceilings; overridable per project within these limits.
        defaultMemoryMb: Number(optional('SANDBOX_MEMORY_MB') ?? 2048),
        defaultCpus: Number(optional('SANDBOX_CPUS') ?? 2),
        defaultPidsLimit: Number(optional('SANDBOX_PIDS') ?? 512),
        idleTimeoutMs: Number(optional('SANDBOX_IDLE_TIMEOUT_MS') ?? 900_000)
    }
} as const;
