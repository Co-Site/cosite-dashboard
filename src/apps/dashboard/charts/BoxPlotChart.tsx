import { Box } from "@chakra-ui/react";
import { BoxAndWiskers, BoxPlotController, IBoxPlot } from "@sgratzl/chartjs-chart-boxplot";
import { CategoryScale, Chart, ChartConfiguration, LinearScale, Tooltip } from "chart.js";
import { useIntl } from "open-pioneer:react-hooks";
import { useCallback } from "react";
import { Observation } from "../dataLayers/sta";
import { createValueFormatter, GRID_COLOR, SERIES_COLOR, SERIES_FILL, TEXT_SECONDARY, valueScale } from "./chartStyle";
import { useChart } from "./useChart";

Chart.register(BoxPlotController, BoxAndWiskers, CategoryScale, LinearScale, Tooltip);

export interface BoxPlotChartProps {
    observations: Observation[];

    /** Name of the series, shown below the box and used for the accessible label. */
    label: string;
    unit: string | undefined;
}

/**
 * Box plot of all observations (of the selected time range): quartiles, median,
 * whiskers (1.5 × interquartile range) and outliers.
 */
export function BoxPlotChart({ observations, label, unit }: BoxPlotChartProps) {
    const intl = useIntl();

    const createConfig = useCallback((): ChartConfiguration<"boxplot"> => {
        const formatValue = createValueFormatter(intl, unit);
        return {
            type: "boxplot",
            data: { labels: [], datasets: [{ data: [] }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                datasets: {
                    boxplot: {
                        backgroundColor: SERIES_FILL,
                        borderColor: SERIES_COLOR,
                        borderWidth: 1,
                        medianColor: SERIES_COLOR,
                        outlierBackgroundColor: SERIES_COLOR,
                        outlierRadius: 2,
                        maxBarThickness: 120,
                        coef: 1.5
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { color: GRID_COLOR },
                        ticks: { color: TEXT_SECONDARY }
                    },
                    y: valueScale(formatValue)
                },
                plugins: {
                    tooltip: {
                        displayColors: false,
                        callbacks: {
                            label: (item) => {
                                const stats = item.parsed as unknown as IBoxPlot;
                                const line = (id: string, value: number) =>
                                    `${intl.formatMessage({ id: `chart.boxplot.${id}` })}: ${formatValue(value)}`;
                                return [
                                    line("max", stats.max),
                                    line("q3", stats.q3),
                                    line("median", stats.median),
                                    line("q1", stats.q1),
                                    line("min", stats.min),
                                    line("mean", stats.mean)
                                ];
                            }
                        }
                    }
                }
            }
        };
    }, [intl, unit]);

    const applyData = useCallback(
        (chart: Chart<"boxplot">) => {
            const dataset = chart.data.datasets[0];
            if (!dataset) {
                return;
            }
            chart.data.labels = [label];
            dataset.data = [observations.map((o) => o.value)];
        },
        [observations, label]
    );
    const canvasRef = useChart(createConfig, applyData);

    return (
        <Box position="relative" height="100%" width="100%">
            <canvas ref={canvasRef} role="img" aria-label={label} />
        </Box>
    );
}
