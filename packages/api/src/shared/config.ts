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

const corsOrigin = optional('CORS_ORIGIN') ?? 'http://localhost:5173';
const port = Number(required('PORT'));

export const config = {
    jwtSecret: required('JWT_SECRET'),
    encryptionKey: required('ENCRYPTION_KEY'),
    port,
    databasePath: required('DATABASE_PATH'),
    corsOrigin,
    // Base URL of the web app, used to build links (e.g. notification deep-links).
    webUrl: optional('WEB_URL') ?? corsOrigin,
    // Open registration. Set false on a personal VPS to run single-admin (see auth module).
    allowSignup: optional('ALLOW_SIGNUP') !== 'false',

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
        baseImage: optional('SANDBOX_BASE_IMAGE') ?? 'cloud-code/sandbox-base:ubuntu',
        network: optional('SANDBOX_NETWORK') ?? 'cloud-code-sandboxes',
        // Per-sandbox resource ceilings; overridable per project within these limits.
        defaultMemoryMb: Number(optional('SANDBOX_MEMORY_MB') ?? 2048),
        defaultCpus: Number(optional('SANDBOX_CPUS') ?? 2),
        defaultPidsLimit: Number(optional('SANDBOX_PIDS') ?? 512),
        idleTimeoutMs: Number(optional('SANDBOX_IDLE_TIMEOUT_MS') ?? 900_000)
    }
} as const;
