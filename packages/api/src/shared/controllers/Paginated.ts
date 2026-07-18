import { Page } from '@/shared/contracts/params';
import { PageMeta } from '@cloud-code/contracts/shared/http';

/**
 * Return this from a handler to emit `{ data, meta }` instead of the plain
 * envelope — the paginated sibling of `RedirectResponse` (see `BaseController`).
 */
export default class Paginated<T>{
    constructor(readonly items: T[], readonly page: Page, readonly total: number){}

    get meta(): PageMeta{
        return { total: this.total, limit: this.page.limit, offset: this.page.offset };
    }
}
