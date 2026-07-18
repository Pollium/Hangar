import { Button, Link } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import { Form } from '@/shared/components/forms/Form';
import { Field } from '@/shared/components/forms/Field';
import { AuthShell } from '@/modules/auth/components/AuthShell';
import { useIdentifierFlow } from '@/modules/auth/hooks/useIdentifierFlow';
import type { ReactNode } from 'react';
import type { IdentifierStep } from '@/modules/auth/hooks/useIdentifierFlow';

const SUBMIT_LABEL: Record<IdentifierStep, string> = {
    email: 'Continue',
    password: 'Sign in',
    signup: 'Create account'
};

// Animated height/opacity reveal — children stay mounted and collapse to 0fr,
// so the transition runs both ways without unmounting the fields.
const Reveal = ({ show, children }: { show: boolean; children: ReactNode }) => (
    <div
        className={`grid transition-all duration-300 ease-out motion-reduce:transition-none ${
            show ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
    >
        <div className='overflow-hidden'>
            <div className='flex flex-col gap-4 pt-4'>{children}</div>
        </div>
    </div>
);

const SignIn = () => {
    const { step, form, back } = useIdentifierFlow();

    return (
        <AuthShell>
            <div className='mb-6 flex flex-col gap-1'>
                <h1 className='text-lg font-semibold text-foreground'>Cloud Code</h1>
                <p className='text-sm text-muted'>Sign in to manage your agent sessions.</p>
            </div>

            <Form form={form} className='flex flex-col'>
                <Reveal show={step === 'signup'}>
                    <button
                        type='button'
                        onClick={back}
                        className='mb-4 flex items-center gap-1.5 self-start text-xs text-muted transition-colors hover:text-foreground'
                    >
                        <ArrowLeft className='size-3.5' />
                        Back
                    </button>
                </Reveal>

                <Field form={form} name='email' label='Email' type='email' placeholder='Email' />

                <Reveal show={step === 'signup'}>
                    <Field form={form} name='fullName' label='Full name' placeholder='Full name' />
                    <Field form={form} name='username' label='Username' placeholder='Username' />
                </Reveal>

                <Reveal show={step !== 'email'}>
                    <Field form={form} name='password' label='Password' type='password' placeholder='Password' />
                </Reveal>

                <Button
                    type='submit'
                    fullWidth
                    size='md'
                    className='mt-4 bg-foreground text-background hover:bg-foreground/90'
                    isPending={form.submitting}
                >
                    {SUBMIT_LABEL[step]}
                </Button>
            </Form>

            <p className='mt-7 text-center text-xs text-muted'>
                By using Cloud Code, you agree to run agents on infrastructure you control.{' '}
                <Link href='https://github.com' className='text-foreground'>Learn more</Link>.
            </p>
        </AuthShell>
    );
};

export default SignIn;
