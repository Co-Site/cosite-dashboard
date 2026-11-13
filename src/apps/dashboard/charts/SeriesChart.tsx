import { Box } from "@chakra-ui/react";
import { Chart, ChartConfiguration } from "chart.js";
import { useIntl } from "open-pioneer:react-hooks";
import { useCallback } from "react";
import { Observation } from "../dataLayers/sta/sta";
import { createValueFormatter, timeScale, valueScale } from "./chartStyle";
import { CROSSHAIR_PLUGIN, withGaps } from "./ObservationChart";
import { TimeRange } from "./timeRange";
import { useChart } from "./useChart";

/** A time series of the chart. */
export interface Series {
    id: string;
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
}

type Point = { x: number; y: number | null };

/**
 * Line chart of several time series on the same axes (x: time, y: value).
 * The chart registrations of {@link ObservationChart} apply.
 */
export function SeriesChart({ series, label, unit, range }: SeriesChartProps) {
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
                        callbacks: {
                            title: (items) =>
                                items[0]
                                    ? intl.formatDate(items[0].parsed.x ?? 0, {
                                          dateStyle: "medium",
                                          timeStyle: "short"
                                      })
                                    : "",
                            label: (item) => `${item.dataset.label}: ${formatValue(item.parsed.y ?? 0)}`
                        }
                    }
                }
            }
        };
    }, [intl, unit]);

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
