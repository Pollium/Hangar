import { useState, useEffect, useCallback } from 'react';
import { credentialApi } from '@/modules/settings/api/api';
import type { CredentialView } from '@hangar/contracts/modules/credential/domain';

export const useCredentials = () => {
    const [credentials, setCredentials] = useState<CredentialView[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        try{
            setCredentials(await credentialApi.list());
        }finally{
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { credentials, loading, refresh };
};
