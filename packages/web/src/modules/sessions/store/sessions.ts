import { create } from 'zustand';
import type { Session, SessionStatus } from '@cloud-code/contracts/modules/session/domain';

interface SessionsState{
    sessions: Session[];
    setSessions: (sessions: Session[]) => void;
    upsert: (session: Session) => void;
    remove: (id: number) => void;
    patchStatus: (id: number, status: SessionStatus) => void;
}

export const useSessionsStore = create<SessionsState>((set) => ({
    sessions: [],
    setSessions: (sessions) => set({ sessions }),
    upsert: (session) => set((state) => {
        const rest = state.sessions.filter((s) => s.id !== session.id);
        return { sessions: [session, ...rest] };
    }),
    remove: (id) => set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) })),
    patchStatus: (id, status) => set((state) => ({
        sessions: state.sessions.map((s) => (s.id === id ? { ...s, status } : s))
    }))
}));
