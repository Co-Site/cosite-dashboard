// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { IconType } from "react-icons";
import { LuChartCandlestick, LuChartColumn, LuChartLine, LuWind } from "react-icons/lu";

/** Types of charts for the observations of a sensor. */
export type ChartType = "line" | "bar" | "boxplot" | "windrose";

export const CHART_TYPES: ChartType[] = ["line", "bar", "boxplot", "windrose"];

/** Icons of the chart types (Lucide has no box plot icon; candlesticks come closest). */
export const CHART_TYPE_ICONS: Record<ChartType, IconType> = {
    line: LuChartLine,
    bar: LuChartColumn,
    boxplot: LuChartCandlestick,
    windrose: LuWind
};
