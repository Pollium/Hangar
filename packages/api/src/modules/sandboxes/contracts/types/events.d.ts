import type { SandboxLifecyclePayload } from '../domain/events';

declare global{
    interface EventMap{
        'sandbox.started': SandboxLifecyclePayload;
        'sandbox.stopped': SandboxLifecyclePayload;
    }
}
