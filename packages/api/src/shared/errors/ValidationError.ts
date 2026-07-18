import RuntimeError from '@/shared/errors/RuntimeError';
import { RequestError } from '@/shared/errors/RequestError';

/**
 * Request-body validation failure. Carries the per-field message map the global
 * error handler serializes as `{ error, errors }` — the shape web forms already
 * render (`useForm.fieldErrorsFromBody`). The optional template lends its code and
 * status when the failure belongs to another domain (`QuizError.ResultsNotReady()`).
 */
export default class ValidationError extends RuntimeError{
    constructor(readonly errors: Record<string, string>, template: RuntimeError = RequestError.ValidationFailed()){
        super(template.message, template.statusCode);
    }
}
