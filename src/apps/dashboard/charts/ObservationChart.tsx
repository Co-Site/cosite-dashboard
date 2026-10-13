import { Box } from "@chakra-ui/react";
import { Chart, LinearScale, LineController, LineElement, Plugin, PointElement, Tooltip } from "chart.js";
import { useIntl } from "open-pioneer:react-hooks";
import { useEffect, useRef } from "react";
import { Observation } from "../dataLayers/sta";
import { createValueFormatter, formatTimeTick, GRID_COLOR, SERIES_COLOR, TEXT_SECONDARY } from "./chartStyle";
import { TimeRange } from "./timeRange";

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip);

const CROSSHAIR_COLOR = "rgba(0, 0, 0, 0.35)";

export interface ObservationChartProps {
    observations: Observation[];

    /** Name of the series, used for the accessible label. */
    label: string;
    unit: string | undefined;

    /** Range of the x axis. */
    range: TimeRange;
}

type Point = { x: number; y: number | null };

/**
 * Line chart of a single time series (x: time, y: value).
 */
export function ObservationChart({ observations, label, unit, range }: ObservationChartProps) {
    const intl = useIntl();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart<"line", Point[]>>(undefined);

    // Create the chart once; data is updated by the effect below.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        const formatValue = createValueFormatter(intl, unit);

        const chart = new Chart<"line", Point[]>(canvas, {
            type: "line",
            data: { datasets: [{ data: [] }] },
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
                        borderColor: SERIES_COLOR,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointHoverBackgroundColor: SERIES_COLOR,
                        pointHoverBorderColor: "#ffffff",
                        pointHoverBorderWidth: 2,
                        tension: 0
                    }
                },
                scales: {
                    x: {
                        type: "linear",
                        grid: { display: false },
                        border: { color: GRID_COLOR },
                        ticks: {
                            color: TEXT_SECONDARY,
                            maxTicksLimit: 8,
                            maxRotation: 0,
                            callback: (value) => formatTimeTick(intl, Number(value))
                        }
                    },
                    y: {
                        grid: { color: GRID_COLOR },
                        border: { display: false },
                        ticks: {
                            color: TEXT_SECONDARY,
                            maxTicksLimit: 6,
                            callback: (value) => formatValue(Number(value))
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        displayColors: false,
                        callbacks: {
                            title: (items) =>
                                items[0]
                                    ? intl.formatDate(items[0].parsed.x ?? 0, {
                                          dateStyle: "medium",
                                          timeStyle: "short"
                                      })
                                    : "",
                            label: (item) => formatValue(item.parsed.y ?? 0)
                        }
                    }
                }
            }
        });
        chartRef.current = chart;
        return () => {
            chart.destroy();
            chartRef.current = undefined;
        };
    }, [intl, unit]);

    useEffect(() => {
        const chart = chartRef.current;
        const dataset = chart?.data.datasets[0];
        if (!chart || !dataset) {
            return;
        }
        dataset.data = withGaps(observations);
        const xScale = chart.options.scales?.x;
        if (xScale) {
            xScale.min = range.from.getTime();
            xScale.max = range.to.getTime();
        }
        chart.update();
    }, [observations, range, intl, unit]);

    return (
        <Box position="relative" height="100%" width="100%">
            <canvas ref={canvasRef} role="img" aria-label={label} />
        </Box>
    );
}

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
