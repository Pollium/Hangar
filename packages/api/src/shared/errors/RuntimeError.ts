/**
 * @class RuntimeError 
 * @description Represents a custom error specifically designed for runtime issues within the Quantum Cloud environment.
 * @extends Error
 */
export default class RuntimeError extends Error{
    public statusCode: number;

    /**
     * @constructor
     * @param {string} message - Descriptive error message explaining the runtime problem.
     * @param {number} statusCode - An HTTP-like status code for categorizing the error.
     */
    constructor(message: string, statusCode: number){
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this,this.constructor);
    }
}   