import { PackageIntl } from "@open-pioneer/runtime";

// Chart colors (canvas needs concrete values), shared by all charts.
export const SERIES_COLOR = "#2a78d6";
export const SERIES_FILL = "rgba(42, 120, 214, 0.35)";

/**
 * Colours to tell series apart. In this order, neighbouring colours stay distinguishable with colour vision
 * deficiencies; colours far apart in the list can look alike.
 */
export const SERIES_COLORS = [
    "#2a78d6",
    "#eb6834",
    "#1baf7a",
    "#eda100",
    "#e87ba4",
    "#008300",
    "#6250d6",
    "#e34948",
    "#25a5c9",
    "#7cb518",
    "#1c5cab",
    "#b03a6e",
    "#7a8500",
    "#8f7be0",
    "#c08a4a",
    "#0a7a4b",
    "#a24cc2",
    "#a35a14",
    "#00889e",
    "#9c2b2b"
];

/** Colour of the series at `index`; the colours repeat after the last one. */
export function seriesColor(index: number): string {
    return SERIES_COLORS[index % SERIES_COLORS.length] ?? SERIES_COLOR;
}
export const TEXT_SECONDARY = "#52514e";
export const GRID_COLOR = "rgba(0, 0, 0, 0.08)";

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
