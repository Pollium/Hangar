// Base declaration for the global event map. Each module augments this interface
// via its own contracts/types/events.d.ts, adding `'event.name': Payload` entries.
// Kept empty here so EventBus type-checks before any module contributes events.
declare global{
    interface EventMap{}
}

export {};
