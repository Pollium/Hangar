/**
 * Implemented by a service whose entity can be addressed by id on behalf of a
 * user. `getOwned` resolves the full prologue in one place: load (404
 * `<Domain>::NotFound`) → access/ownership check (403 `<Domain>::Forbidden`).
 * The `@Owned(Service)` parameter decorator (auth module) calls it to inject
 * the authorized entity at the route edge. Shape only — `shared/` never
 * imports from `modules/`.
 */
export interface OwnedResolver<T>{
    getOwned(userId: number, id: number): Promise<T>;
}
