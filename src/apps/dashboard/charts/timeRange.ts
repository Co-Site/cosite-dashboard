export interface TimeRange {
    from: Date;
    to: Date;
}

/** Last 24 hours, 7 or 30 days, or the entire period of the time series (`all`). */
export type TimeRangePreset = "24h" | "7d" | "30d" | "all";

export const TIME_RANGE_PRESETS: TimeRangePreset[] = ["24h", "7d", "30d", "all"];

/** The time filter of the dashboard: a preset or a custom range. */
export interface TimeFilter {
    preset: TimeRangePreset | undefined;
    range: TimeRange;
}

const HOUR = 60 * 60 * 1000;

const PRESET_DURATION: Record<Exclude<TimeRangePreset, "all">, number> = {
    "24h": 24 * HOUR,
    "7d": 7 * 24 * HOUR,
    "30d": 30 * 24 * HOUR
};

/**
 * Returns the time filter for a preset, ending now.
 * The entire period (`all`) starts at the epoch, so that all observations are requested.
 */
export function presetFilter(preset: TimeRangePreset, now = new Date()): TimeFilter {
    const from = preset === "all" ? new Date(0) : new Date(now.getTime() - PRESET_DURATION[preset]);
    return { preset, range: { from, to: now } };
}

/**
 * Returns the range to display (e.g. as x axis): the filter's range, or for the entire period (`all`)
 * the range from the first observation (`firstTime`, milliseconds since epoch) to the end of the filter.
 */
export function displayRange(filter: TimeFilter, firstTime: number | undefined): TimeRange {
    if (filter.preset === "all" && firstTime !== undefined) {
        return { from: new Date(firstTime), to: filter.range.to };
    }
    return filter.range;
}

/** Formats a date for `<input type="datetime-local">` (local time, minute precision). */
export function toLocalInputValue(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
}

/** Parses the value of `<input type="datetime-local">` (local time). */
export function fromLocalInputValue(value: string): Date | undefined {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
    if (!match) {
        return undefined;
    }
    const [year, month, day, hours, minutes] = match.slice(1).map(Number) as [number, number, number, number, number];
    const date = new Date(year, month - 1, day, hours, minutes);
    return Number.isNaN(date.getTime()) ? undefined : date;
}
