import SessionService from '@/modules/sessions/services/SessionService';
import type Session from '@/modules/sessions/models/Session';

export default class FleetService{
    #sessions = new SessionService();

    snapshot(userId: number): Promise<Session[]>{
        return this.#sessions.list(userId);
    }
}
