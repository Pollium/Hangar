import SecretCipher from '@/shared/services/SecretCipher';
import Credential from '../models/Credential';
import { CredentialError } from '../contracts/domain/errors';
import type { CredentialView } from '@hangar/contracts/modules/credential/domain';
import type { CreateCredentialInput } from '@hangar/contracts/modules/credential/http';

export default class CredentialService{
    #cipher = new SecretCipher();

    async create(userId: number, input: CreateCredentialInput): Promise<CredentialView>{
        // Keep the proven encrypted storage schema for backward compatibility. The public API
        // intentionally exposes only name/value; legacy provider/label columns are internal.
        const credential = await Credential.create({
            ownerId: userId,
            provider: 'custom',
            label: input.name,
            envVar: input.name,
            ciphertext: this.#cipher.encrypt(input.value)
        }).save();
        return this.#view(credential);
    }

    async list(userId: number): Promise<CredentialView[]>{
        const credentials = await Credential.findBy({ ownerId: userId });
        return credentials.map((credential) => this.#view(credential));
    }

    async remove(userId: number, id: number): Promise<void>{
        const credential = await Credential.findOneBy({ id });
        if(!credential) throw CredentialError.NotFound();
        if(credential.ownerId !== userId) throw CredentialError.Forbidden();
        await credential.remove();
    }

    /**
     * Internal only — never exposed over HTTP. Decrypts the owner's variables into
     * `KEY=value` entries for injection into a sandbox process. When `names` is given,
     * only matching variables are resolved. Credentials are intentionally per-user, not
     * shared at the project level: a session always runs with its creator's own keys
     * (`Session.ownerId`), even when other project members can view or restart it.
     */
    async resolveEnvFor(userId: number, names?: string[]): Promise<string[]>{
        const credentials = await Credential.findBy({ ownerId: userId });
        const wanted = names ? new Set(names) : null;

        return credentials
            .filter((credential) => !wanted || wanted.has(credential.envVar))
            .map((credential) => `${credential.envVar}=${this.#cipher.decrypt(credential.ciphertext)}`);
    }

    #view(credential: Credential): CredentialView{
        return {
            id: credential.id,
            createdAt: credential.createdAt.toISOString(),
            updatedAt: credential.updatedAt.toISOString(),
            name: credential.envVar
        };
    }
}
