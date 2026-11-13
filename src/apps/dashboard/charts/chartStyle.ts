import { PackageIntl } from "@open-pioneer/runtime";
import { asArray } from "ol/color";

// Chart colors (canvas needs concrete values), shared by all charts.
// `SERIES_COLOR` is used until the station of a sensor is known, see `useStationColors`.
export const SERIES_COLOR = "#2a78d6";

export const TEXT_SECONDARY = "#52514e";
export const GRID_COLOR = "rgba(0, 0, 0, 0.08)";

/** The translucent fill that belongs to a series colour. */
export function seriesFill(color: string): string {
    const [r, g, b] = asArray(color);
    return `rgba(${r}, ${g}, ${b}, 0.35)`;
}

/** Formats an observed value with its unit, e.g. `12.34 °C`. */
export function createValueFormatter(intl: PackageIntl, unit: string | undefined): (value: number) => string {
    return (value) => `${intl.formatNumber(value, { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;
}

/** Formats a tick of a time axis (milliseconds since epoch), e.g. `09.10., 12:00`. */
export function formatTimeTick(intl: PackageIntl, value: number): string {
    return intl.formatDate(value, {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

/** Linear x axis of a time series: ticks show the time (milliseconds since epoch). */
export function timeScale(intl: PackageIntl) {
    return {
        type: "linear" as const,
        grid: { display: false },
        border: { color: GRID_COLOR },
        ticks: {
            color: TEXT_SECONDARY,
            maxTicksLimit: 8,
            maxRotation: 0,
            callback: (value: number | string) => formatTimeTick(intl, Number(value))
        }
    };
}

/** y axis of observed values, ticks formatted with `formatValue` (see {@link createValueFormatter}). */
export function valueScale(formatValue: (value: number) => string) {
    return {
        grid: { color: GRID_COLOR },
        border: { display: false },
        ticks: {
            color: TEXT_SECONDARY,
            maxTicksLimit: 6,
            callback: (value: number | string) => formatValue(Number(value))
        }
    };
}
