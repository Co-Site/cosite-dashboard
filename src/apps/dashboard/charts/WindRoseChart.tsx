import { Box, Flex, Text } from "@chakra-ui/react";
import { ArcElement, Chart, ChartConfiguration, PolarAreaController, RadialLinearScale, Tooltip } from "chart.js";
import { useIntl } from "open-pioneer:react-hooks";
import { useCallback, useMemo } from "react";
import { Observation } from "../dataLayers/sta/sta";
import { GRID_COLOR, SERIES_COLOR, SERIES_FILL, TEXT_SECONDARY } from "./chartStyle";
import { DIRECTION_SECTORS, directionFrequencies, isDirectionData } from "./statistics";
import { useChart } from "./useChart";

Chart.register(PolarAreaController, ArcElement, RadialLinearScale, Tooltip);

export interface WindRoseChartProps {
    observations: Observation[];

    /** Name of the series, used for the accessible label. */
    label: string;
    unit: string | undefined;
}

/**
 * Wind rose (basic version): share of the observations per direction (16 sectors, in percent).
 * Requires directions in degrees; for other data, the rose stays empty and a hint is shown.
 */
export function WindRoseChart({ observations, label, unit }: WindRoseChartProps) {
    const intl = useIntl();
    const valid = isDirectionData(unit, observations);
    const frequencies = useMemo(
        () => (valid ? directionFrequencies(observations) : new Array(DIRECTION_SECTORS).fill(0)),
        [valid, observations]
    );

    const createConfig = useCallback((): ChartConfiguration<"polarArea"> => {
        const formatPercent = (value: number) => `${intl.formatNumber(value, { maximumFractionDigits: 1 })} %`;
        return {
            type: "polarArea",
            data: {
                labels: intl.formatMessage({ id: "chart.windrose.directions" }).split(","),
                datasets: [{ data: [] }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                datasets: {
                    polarArea: {
                        backgroundColor: SERIES_FILL,
                        borderColor: SERIES_COLOR,
                        borderWidth: 1,
                        hoverBackgroundColor: SERIES_COLOR
                    }
                },
                scales: {
                    r: {
                        // Center the first sector (north) at the top; sectors and labels follow the scale.
                        startAngle: -180 / DIRECTION_SECTORS,
                        beginAtZero: true,
                        suggestedMax: 10,
                        grid: { color: GRID_COLOR },
                        angleLines: { display: true, color: GRID_COLOR },
                        pointLabels: {
                            display: true,
                            centerPointLabels: true,
                            color: TEXT_SECONDARY,
                            font: { size: 10 }
                        },
                        ticks: {
                            color: TEXT_SECONDARY,
                            backdropColor: "transparent",
                            maxTicksLimit: 4,
                            callback: (value) => formatPercent(Number(value))
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        displayColors: false,
                        callbacks: {
                            label: (item) =>
                                `${intl.formatMessage({ id: "chart.frequency" })}: ${formatPercent(item.parsed.r)}`
                        }
                    }
                }
            }
        };
    }, [intl]);

    const applyData = useCallback(
        (chart: Chart<"polarArea">) => {
            const dataset = chart.data.datasets[0];
            if (!dataset) {
                return;
            }
            dataset.data = frequencies;
        },
        [frequencies]
    );
    const canvasRef = useChart(createConfig, applyData);

    return (
        <Flex direction="column" height="100%" width="100%">
            {!valid && (
                <Text fontSize="sm" color="fg.muted">
                    {intl.formatMessage({ id: "chart.windrose.noData" })}
                </Text>
            )}
            <Box position="relative" flex="1" minHeight={0}>
                <canvas ref={canvasRef} role="img" aria-label={label} />
            </Box>
        </Flex>
    );
}
