import type { IValidation } from 'typia';
import type { FormEvent } from 'react';

/** Compile-time generated validator, e.g. `typia.createValidate<SignInInput>()`. */
export type Validator<T> = (input: unknown) => IValidation<T>;

export interface UseFormOptions<T>{
    validate: Validator<T>;
    initialValues: T;
    onSubmit: (values: T) => void | Promise<void>;
    validateOn?: 'blur' | 'change' | 'submit';
    /** Friendly copy for known wire error codes; unmapped codes fall back to the raw message. */
    submitErrorMessages?: Readonly<Partial<Record<string, string>>>;
}

export interface FieldBinding<V>{
    name: string;
    value: V;
    onChange: (value: V) => void;
    onBlur: () => void;
    isInvalid: boolean;
    errorMessage: string | undefined;
}

export interface FormApi<T>{
    values: T;
    errors: Partial<Record<keyof T, string>>;
    submitting: boolean;
    submitError: string | null;
    isValid: boolean;
    field: <K extends keyof T>(name: K) => FieldBinding<T[K]>;
    handleSubmit: (event?: FormEvent) => void;
    setValues: (patch: Partial<T>) => void;
    reset: () => void;
}
