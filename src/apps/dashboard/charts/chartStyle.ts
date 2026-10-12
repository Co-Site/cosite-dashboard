// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { PackageIntl } from "@open-pioneer/runtime";

// Chart colors (canvas needs concrete values), shared by all charts.
export const SERIES_COLOR = "#2a78d6";
export const SERIES_FILL = "rgba(42, 120, 214, 0.35)";
export const TEXT_SECONDARY = "#52514e";
export const GRID_COLOR = "rgba(0, 0, 0, 0.08)";

/** Formats an observed value with its unit, e.g. `12.34 °C`. */
export function createValueFormatter(
    intl: PackageIntl,
    unit: string | undefined
): (value: number) => string {
    return (value) =>
        `${intl.formatNumber(value, { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;
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
