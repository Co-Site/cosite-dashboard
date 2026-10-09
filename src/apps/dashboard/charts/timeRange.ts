// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

export interface TimeRange {
    from: Date;
    to: Date;
}

export type TimeRangePreset = "24h" | "7d" | "30d";

export const TIME_RANGE_PRESETS: TimeRangePreset[] = ["24h", "7d", "30d"];

/** The time filter of the dashboard: a preset or a custom range. */
export interface TimeFilter {
    preset: TimeRangePreset | undefined;
    range: TimeRange;
}

const HOUR = 60 * 60 * 1000;

const PRESET_DURATION: Record<TimeRangePreset, number> = {
    "24h": 24 * HOUR,
    "7d": 7 * 24 * HOUR,
    "30d": 30 * 24 * HOUR
};

export function presetFilter(preset: TimeRangePreset, now = new Date()): TimeFilter {
    return {
        preset,
        range: { from: new Date(now.getTime() - PRESET_DURATION[preset]), to: now }
    };
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
    const [year, month, day, hours, minutes] = match.slice(1).map(Number) as [
        number,
        number,
        number,
        number,
        number
    ];
    const date = new Date(year, month - 1, day, hours, minutes);
    return Number.isNaN(date.getTime()) ? undefined : date;
}
