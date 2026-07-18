const statusByHandler = new WeakMap<object, Map<string | symbol, number>>();

/**
 * @decorator Status
 * @description Overrides the HTTP status a successful handler responds with.
 * Without it a handler returning a value responds 200, and one returning
 * undefined/null responds 204.
 * @param {number} code - HTTP status code, e.g. 201.
 */
export const Status = (code: number): MethodDecorator => {
    return (target, handlerName) => {
        const ctor = target.constructor;

        let codes = statusByHandler.get(ctor);
        if(!codes){
            codes = new Map();
            statusByHandler.set(ctor, codes);
        }

        codes.set(handlerName, code);
    };
};

/**
 * @function getStatus
 * @description Returns the success status declared with @Status on a handler, if any.
 */
export const getStatus = (ctor: object, handlerName: string | symbol): number | undefined => {
    return statusByHandler.get(ctor)?.get(handlerName);
};
