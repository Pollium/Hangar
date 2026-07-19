/** A short-lived ticket the web app feeds into the codespace iframe URL. */
export interface CodespaceTicket{
    /** Project-scoped token, exchanged by the proxy for an httpOnly cookie. */
    token: string;
    /** Same-origin base path the iframe should load, e.g. `/codespace/7/`. */
    path: string;
}
