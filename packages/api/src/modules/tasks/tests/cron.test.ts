import { describe, expect, it } from 'vitest';
import { cronMatches } from '../services/cron';

// Fixed local time: 2026-07-18 09:05, a Saturday (getDay() === 6).
const at = (min: number, hour: number, dom = 18, month = 7) => new Date(2026, month - 1, dom, hour, min);

describe('cronMatches', () => {
    it('matches a wildcard expression', () => {
        expect(cronMatches('* * * * *', at(5, 9))).toBe(true);
    });

    it('matches an exact minute and hour', () => {
        expect(cronMatches('5 9 * * *', at(5, 9))).toBe(true);
        expect(cronMatches('5 9 * * *', at(6, 9))).toBe(false);
    });

    it('matches a step expression', () => {
        expect(cronMatches('*/5 * * * *', at(10, 0))).toBe(true);
        expect(cronMatches('*/5 * * * *', at(11, 0))).toBe(false);
    });

    it('matches a range and list', () => {
        expect(cronMatches('0 9-17 * * *', at(0, 13))).toBe(true);
        expect(cronMatches('0 9,21 * * *', at(0, 21))).toBe(true);
        expect(cronMatches('0 9,21 * * *', at(0, 15))).toBe(false);
    });

    it('rejects a malformed expression', () => {
        expect(cronMatches('bogus', at(0, 0))).toBe(false);
        expect(cronMatches('* * *', at(0, 0))).toBe(false);
    });
});
