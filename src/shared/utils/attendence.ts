export const OFFICE_START_HOUR = 9;
export const OFFICE_START_MINUTE = 0;


export function getOfficeStartTime(date: Date = new Date()): Date {
    const start = new Date(date);
    start.setHours(OFFICE_START_HOUR, OFFICE_START_MINUTE, 0, 0);
    return start;
}

export function parseBool(value: string): boolean | null {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
    return null;
}

export function getUtcRangeFromLocalDate(dateStr: string): { start: Date; end: Date } {
    const localDate = new Date(`${dateStr}T00:00:00+05:30`);
    const start = new Date(localDate.toISOString());
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 1);
    return { start, end };
}