import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useNewSessionModalStore } from '@/modules/sessions/store/newSessionModal';

const NewSession = () => {
    useEffect(() => {
        useNewSessionModalStore.getState().open();
    }, []);

    return <Navigate to='/' replace />;
};

export default NewSession;
