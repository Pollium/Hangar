import { useEffect, useState } from 'react';
import { useRequest } from 'alova/client';
import typia from 'typia';
import { useForm } from '@/shared/hooks/forms/useForm';
import { authApi } from '@/modules/auth/api/api';
import { authErrorMessages } from '@/modules/auth/utils/errorMessages';
import { useAuthStore } from '@/modules/auth/store/auth';
import type { CheckEmailInput, SignInInput, SignUpInput } from '@hangar/contracts/modules/auth/http';
import type { Validator } from '@/shared/contracts/form';

export type IdentifierStep = 'email' | 'password' | 'signup';

const validators = {
    email: typia.createValidate<CheckEmailInput>(),
    password: typia.createValidate<SignInInput>(),
    signup: typia.createValidate<SignUpInput>()
};

// Every step validates the same values object; earlier steps just check fewer fields.
const validatorForStep = (step: IdentifierStep) => validators[step] as Validator<SignUpInput>;

export const useIdentifierFlow = () => {
    const setToken = useAuthStore((state) => state.setToken);
    const [step, setStep] = useState<IdentifierStep>('email');

    const checkEmail = useRequest(authApi.checkEmail, { immediate: false });
    const signIn = useRequest(authApi.signIn, { immediate: false });
    const signUp = useRequest(authApi.signUp, { immediate: false });

    const form = useForm<SignUpInput>({
        validate: validatorForStep(step),
        submitErrorMessages: authErrorMessages,
        initialValues: { email: '', fullName: '', username: '', password: '' },
        onSubmit: async (values) => {
            if(step === 'email'){
                const { exists } = await checkEmail.send({ email: values.email });
                setStep(exists ? 'password' : 'signup');
                return;
            }

            const session = step === 'password'
                ? await signIn.send({ email: values.email, password: values.password })
                : await signUp.send(values);

            setToken(session.token);
        }
    });

    // Editing the email after it has been checked sends the flow back to the email step.
    useEffect(() => {
        setStep((current) => (current === 'email' ? current : 'email'));
    }, [form.values.email]);

    const back = () => setStep('email');

    return { step, form, back };
};
