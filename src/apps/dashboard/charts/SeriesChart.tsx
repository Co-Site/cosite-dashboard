import { Box } from "@chakra-ui/react";
import {
    Chart,
    ChartConfiguration,
    LinearScale,
    LineController,
    LineElement,
    Plugin,
    PointElement,
    Tooltip
} from "chart.js";
import { useIntl } from "open-pioneer:react-hooks";
import { useCallback } from "react";
import { Observation } from "../dataLayers/sta/sta";
import { createValueFormatter, timeScale, valueScale } from "./chartStyle";
import { TimeRange } from "./timeRange";
import { useChart } from "./useChart";

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip);

const CROSSHAIR_COLOR = "rgba(0, 0, 0, 0.35)";

/** Draws a vertical line at the hovered x position. */
const CROSSHAIR_PLUGIN: Plugin<"line"> = {
    id: "crosshair",
    afterDatasetsDraw(chart) {
        const active = chart.tooltip?.getActiveElements()[0];
        if (!active) {
            return;
        }
        const { ctx, chartArea } = chart;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(active.element.x, chartArea.top);
        ctx.lineTo(active.element.x, chartArea.bottom);
        ctx.lineWidth = 1;
        ctx.strokeStyle = CROSSHAIR_COLOR;
        ctx.stroke();
        ctx.restore();
    }
};

/** A time series of the chart. */
export interface Series {
    label: string;
    color: string;
    observations: Observation[];
}

export interface SeriesChartProps {
    series: Series[];

    /** What the series have in common (e.g. the observed property), used for the accessible label. */
    label: string;
    unit: string | undefined;

    /** Range of the x axis. */
    range: TimeRange;

    /**
     * Whether the tooltip names the series of a value (with its colour).
     * Not needed for a single series whose name stands above the chart.
     */
    seriesNames?: boolean;
}

type Point = { x: number; y: number | null };

/**
 * Inserts `null` points where the time between two observations is much larger than usual,
 * so that missing data is shown as a gap instead of a straight line.
 */
export function withGaps(observations: Observation[]): Point[] {
    const intervals = observations
        .slice(1)
        .map((o, i) => o.time - (observations[i]?.time ?? o.time))
        .sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)] ?? 0;
    const maxGap = Math.max(median * 5, 60 * 60 * 1000);

    const points: Point[] = [];
    let previous: Observation | undefined;
    for (const o of observations) {
        if (previous && o.time - previous.time > maxGap) {
            points.push({ x: (previous.time + o.time) / 2, y: null });
        }
        points.push({ x: o.time, y: o.value });
        previous = o;
    }
    return points;
}

/**
 * Line chart of one or several time series on the same axes (x: time, y: value).
 */
export function SeriesChart({ series, label, unit, range, seriesNames = false }: SeriesChartProps) {
    const intl = useIntl();

    const createConfig = useCallback((): ChartConfiguration<"line", Point[]> => {
        const formatValue = createValueFormatter(intl, unit);
        return {
            type: "line",
            data: { datasets: [] },
            plugins: [CROSSHAIR_PLUGIN],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                parsing: false,
                normalized: true,
                interaction: { mode: "nearest", axis: "x", intersect: false },
                datasets: {
                    line: {
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointHoverBorderColor: "#ffffff",
                        pointHoverBorderWidth: 2,
                        tension: 0
                    }
                },
                scales: {
                    x: timeScale(intl),
                    y: valueScale(formatValue)
                },
                plugins: {
                    tooltip: {
                        displayColors: seriesNames,
                        callbacks: {
                            title: (items) =>
                                items[0]
                                    ? intl.formatDate(items[0].parsed.x ?? 0, {
                                          dateStyle: "medium",
                                          timeStyle: "short"
                                      })
                                    : "",
                            label: (item) => {
                                const value = formatValue(item.parsed.y ?? 0);
                                return seriesNames ? `${item.dataset.label}: ${value}` : value;
                            }
                        }
                    }
                }
            }
        };
    }, [intl, unit, seriesNames]);

    const applyData = useCallback(
        (chart: Chart<"line", Point[]>) => {
            chart.data.datasets = series.map(({ label, color, observations }) => ({
                label,
                data: withGaps(observations),
                borderColor: color,
                backgroundColor: color,
                pointHoverBackgroundColor: color
            }));
            const xScale = chart.options.scales?.x;
            if (xScale) {
                xScale.min = range.from.getTime();
                xScale.max = range.to.getTime();
            }
        },
        [series, range]
    );
    const canvasRef = useChart(createConfig, applyData);

    return (
        <Box position="relative" height="100%" width="100%">
            <canvas ref={canvasRef} role="img" aria-label={label} />
        </Box>
    );
}
