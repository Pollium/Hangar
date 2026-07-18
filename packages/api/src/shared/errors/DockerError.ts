import { defineErrors } from '@/shared/errors/defineErrors';

export const DockerError = defineErrors({
    domain: 'Docker',
    causes: {
        CreateFailed: 500,
        NotFound: 404,
        ExecFailed: 500,
        PullFailed: 502,
        NotRunning: 409
    }
});
