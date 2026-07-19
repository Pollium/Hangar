const required = (key: string): string => {
    const value = process.env[key];
    if(!value) throw new Error(`Missing required env var ${key}`);
    return value;
};

// http(s):// → ws(s):// so operators can paste the same base URL they use for the API.
const toWebSocketBase = (url: string): string => url.replace(/^http/, 'ws').replace(/\/+$/, '');

export const config = {
    /** Control-plane WebSocket base, e.g. wss://api.example.com (http/https accepted). */
    url: toWebSocketBase(required('HANGAR_URL')),
    /** Agent token minted in the app (Connect VPS). Authenticates this host to the control plane. */
    token: required('HANGAR_TOKEN'),
    dockerSocket: process.env.DOCKER_SOCKET ?? '/var/run/docker.sock'
};
