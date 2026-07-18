import SecretCipher from '@/shared/services/SecretCipher';
import Credential from '../models/Credential';
import { CredentialError } from '../contracts/domain/errors';
import type { CreateCredentialInput } from '@cloud-code/contracts/modules/credential/http';

export default class CredentialService{
    #cipher = new SecretCipher();

    create(userId: number, input: CreateCredentialInput): Promise<Credential>{
        const entity = Credential.create({
            ownerId: userId,
            provider: input.provider,
            label: input.label,
            envVar: input.envVar,
            ciphertext: this.#cipher.encrypt(input.secret)
        });
        return entity.save() as Promise<Credential>;
    }

    list(userId: number): Promise<Credential[]>{
        return Credential.findBy({ ownerId: userId });
    }

    async remove(userId: number, id: number): Promise<void>{
        const credential = await Credential.findOneBy({ id });
        if(!credential) throw CredentialError.NotFound();
        if(credential.ownerId !== userId) throw CredentialError.Forbidden();
        await credential.remove();
    }

    /**
     * Internal only — never exposed over HTTP. Decrypts the owner's credentials into
     * `KEY=value` env entries for injection into a sandbox process. When `envVars` is given,
     * only matching credentials are resolved (what a specific CLI adapter requires).
     */
    async resolveEnvFor(userId: number, envVars?: string[]): Promise<string[]>{
        const credentials = await Credential.findBy({ ownerId: userId });
        const wanted = envVars ? new Set(envVars) : null;

        return credentials
            .filter((credential) => !wanted || wanted.has(credential.envVar))
            .map((credential) => `${credential.envVar}=${this.#cipher.decrypt(credential.ciphertext)}`);
    }
}
