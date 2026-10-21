import { Box } from "@chakra-ui/react";
import { PackageIntl } from "@open-pioneer/runtime";
import { BarController, BarElement, Chart, ChartConfiguration, LinearScale, Tooltip } from "chart.js";
import { useIntl } from "open-pioneer:react-hooks";
import { useCallback, useMemo } from "react";
import { Observation } from "../dataLayers/sta";
import { createValueFormatter, SERIES_COLOR, SERIES_FILL, timeScale, valueScale } from "./chartStyle";
import { Bucket, BucketSize, bucketSize, meanPerBucket } from "./statistics";
import { TimeRange } from "./timeRange";
import { useChart } from "./useChart";

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
    const size = bucketSize(range);
    const buckets = useMemo(() => meanPerBucket(observations, size), [observations, size]);

    const createConfig = useCallback((): ChartConfiguration<"bar", BarPoint[]> => {
        const formatValue = createValueFormatter(intl, unit);
        const meanLabel = intl.formatMessage({ id: `chart.bar.${size}` });
        return {
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
                    x: timeScale(intl),
                    y: valueScale(formatValue)
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
                                    intl.formatMessage({ id: "chart.count" }, { count: bucket.count })
                                ];
                            }
                        }
                    }
                }
            }
        };
    }, [intl, unit, size]);

    const applyData = useCallback(
        (chart: Chart<"bar", BarPoint[]>) => {
            const dataset = chart.data.datasets[0];
            if (!dataset) {
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
        },
        [buckets, range]
    );
    const canvasRef = useChart(createConfig, applyData);

    return (
        <Box position="relative" height="100%" width="100%">
            <canvas ref={canvasRef} role="img" aria-label={label} />
        </Box>
    );
}

function formatBucket(intl: PackageIntl, bucket: Bucket, size: BucketSize): string {
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
