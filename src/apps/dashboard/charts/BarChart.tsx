// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { Box } from "@chakra-ui/react";
import { BarController, BarElement, Chart, LinearScale, Tooltip } from "chart.js";
import { useIntl } from "open-pioneer:react-hooks";
import { useEffect, useMemo, useRef } from "react";
import { Observation } from "../dataLayers/sta";
import {
    createValueFormatter,
    formatTimeTick,
    GRID_COLOR,
    SERIES_COLOR,
    SERIES_FILL,
    TEXT_SECONDARY
} from "./chartStyle";
import { Bucket, bucketSize, meanPerBucket } from "./statistics";
import { TimeRange } from "./timeRange";

Chart.register(BarController, BarElement, LinearScale, Tooltip);

export interface BarChartProps {
    observations: Observation[];

    /** Name of the series, used for the accessible label. */
    label: string;
    unit: string | undefined;

    /** Range of the x axis; also determines the length of the sections (hour, day, week). */
    range: TimeRange;
}

type BarPoint = { x: number; y: number; bucket: Bucket };

/**
 * Bar chart of the mean value per section of time (hour, day or week, depending on the range).
 */
export function BarChart({ observations, label, unit, range }: BarChartProps) {
    const intl = useIntl();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart<"bar", BarPoint[]>>(undefined);
    const size = bucketSize(range);
    const buckets = useMemo(() => meanPerBucket(observations, size), [observations, size]);

    // Create the chart once per size; data is updated by the effect below.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        const formatValue = createValueFormatter(intl, unit);
        const meanLabel = intl.formatMessage({ id: `chart.bar.${size}` });
        const chart = new Chart<"bar", BarPoint[]>(canvas, {
            type: "bar",
            data: { datasets: [{ data: [] }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                parsing: false,
                datasets: {
                    bar: {
                        backgroundColor: SERIES_FILL,
                        borderColor: SERIES_COLOR,
                        borderWidth: 1,
                        hoverBackgroundColor: SERIES_COLOR,
                        barPercentage: 0.9,
                        categoryPercentage: 1
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
                            title: (items) => {
                                const bucket = (items[0]?.raw as BarPoint | undefined)?.bucket;
                                return bucket ? formatBucket(intl, bucket, size) : "";
                            },
                            label: (item) => {
                                const { bucket } = item.raw as BarPoint;
                                return [
                                    `${meanLabel}: ${formatValue(bucket.mean)}`,
                                    intl.formatMessage(
                                        { id: "chart.count" },
                                        { count: bucket.count }
                                    )
                                ];
                            }
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
    }, [intl, unit, size]);

    useEffect(() => {
        const chart = chartRef.current;
        const dataset = chart?.data.datasets[0];
        if (!chart || !dataset) {
            return;
        }
        // Each bar is centered in its section.
        dataset.data = buckets.map((bucket) => ({
            x: (bucket.start + bucket.end) / 2,
            y: bucket.mean,
            bucket
        }));
        const xScale = chart.options.scales?.x;
        if (xScale) {
            xScale.min = range.from.getTime();
            xScale.max = range.to.getTime();
        }
        chart.update();
    }, [buckets, range, intl, unit, size]);

    return (
        <Box position="relative" height="100%" width="100%">
            <canvas ref={canvasRef} role="img" aria-label={label} />
        </Box>
    );
}

function formatBucket(
    intl: ReturnType<typeof useIntl>,
    bucket: Bucket,
    size: ReturnType<typeof bucketSize>
): string {
    if (size === "hour") {
        return intl.formatDate(bucket.start, { dateStyle: "medium", timeStyle: "short" });
    }
    const start = intl.formatDate(bucket.start, { dateStyle: "medium" });
    if (size === "day") {
        return start;
    }
    // Last day of the week (end is exclusive).
    const end = intl.formatDate(bucket.end - 1, { dateStyle: "medium" });
    return `${start} – ${end}`;
}
