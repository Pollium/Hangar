type SendInput = (data: string) => boolean;

const DEFAULT_MAX_PENDING = 8_192;

/** Keeps keystrokes local until the gateway confirms that this socket owns a live PTY. */
export default class TerminalInputGate{
    #isOpen = false;
    #pending = '';
    readonly #send: SendInput;
    readonly #maxPending: number;

    constructor(send: SendInput, maxPending = DEFAULT_MAX_PENDING){
        this.#send = send;
        this.#maxPending = maxPending;
    }

    push(data: string): void{
        if(this.#isOpen && this.#send(data)) return;
        this.#isOpen = false;
        this.#pending = `${this.#pending}${data}`.slice(-this.#maxPending);
    }

    open(): void{
        this.#isOpen = true;
        if(!this.#pending) return;
        if(!this.#send(this.#pending)){
            this.#isOpen = false;
            return;
        }
        this.#pending = '';
    }

    block(clearPending = false): void{
        this.#isOpen = false;
        if(clearPending) this.#pending = '';
    }
}
