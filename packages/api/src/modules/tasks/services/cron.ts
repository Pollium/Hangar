/**
 * Minimal standard 5-field cron matcher: `minute hour day-of-month month day-of-week`.
 * Supports `*`, exact numbers, ranges `a-b`, steps `*​/n` and `a-b/n`, and lists `a,b`.
 * Enough for scheduled agent tasks without pulling a dependency.
 */
const matchField = (field: string, value: number, min: number, max: number): boolean => {
    return field.split(',').some((part) => {
        const [range, stepRaw] = part.split('/');
        const step = stepRaw ? Number(stepRaw) : 1;
        if(Number.isNaN(step) || step < 1) return false;

        let lo = min;
        let hi = max;
        if(range !== '*'){
            const [a, b] = range.split('-');
            lo = Number(a);
            hi = b === undefined ? (stepRaw ? max : Number(a)) : Number(b);
            if(Number.isNaN(lo) || Number.isNaN(hi)) return false;
        }

        if(value < lo || value > hi) return false;
        return (value - lo) % step === 0;
    });
};

export const cronMatches = (expression: string, date: Date): boolean => {
    const fields = expression.trim().split(/\s+/);
    if(fields.length !== 5) return false;

    const [minute, hour, dom, month, dow] = fields;
    return matchField(minute, date.getMinutes(), 0, 59)
        && matchField(hour, date.getHours(), 0, 23)
        && matchField(dom, date.getDate(), 1, 31)
        && matchField(month, date.getMonth() + 1, 1, 12)
        && matchField(dow, date.getDay(), 0, 6);
};
