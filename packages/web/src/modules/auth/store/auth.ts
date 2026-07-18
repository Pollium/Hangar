import { create } from 'zustand';

const STORAGE_KEY = 'cloud-code.token';

const readToken = (): string | null => {
    try{
        return localStorage.getItem(STORAGE_KEY);
    }catch{
        return null;
    }
};

const writeToken = (token: string | null): void => {
    try{
        if(token) localStorage.setItem(STORAGE_KEY, token);
        else localStorage.removeItem(STORAGE_KEY);
    }catch{
        // storage unavailable (private mode) — session stays in-memory only
    }
};

interface AuthState{
    token: string | null;
    setToken: (token: string | null) => void;
    clear: () => void;
}

// Token persists to localStorage so a refresh keeps the session; alova reads it for the
// Authorization header and SocketChannel passes it as the WS subprotocol.
export const useAuthStore = create<AuthState>((set) => ({
    token: readToken(),
    setToken: (token) => {
        writeToken(token);
        set({ token });
    },
    clear: () => {
        writeToken(null);
        set({ token: null });
    }
}));
