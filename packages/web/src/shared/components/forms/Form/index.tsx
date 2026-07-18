import type { ReactNode } from 'react';
import type { FormApi } from '@/shared/contracts/form';

export interface FormProps<T extends object>{
    form: FormApi<T>;
    children: ReactNode;
    className?: string;
}

export const Form = <T extends object>({ form, children, className }: FormProps<T>) => (
    <form noValidate className={className} onSubmit={form.handleSubmit}>
        <fieldset disabled={form.submitting} className='contents'>
            {children}
        </fieldset>
        {form.submitError ? (
            <p role='alert' className='text-sm text-[var(--danger)]'>{form.submitError}</p>
        ) : null}
    </form>
);
