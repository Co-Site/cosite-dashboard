import { Box, Flex, Spinner, Text } from "@chakra-ui/react";
import { createLogger, isAbortError } from "@open-pioneer/core";
import { useMapModelValue } from "@open-pioneer/map";
import { useIntl } from "open-pioneer:react-hooks";
import { useEffect, useMemo, useState } from "react";
import { fetchObservations, Observation, StaDatastreamProperties } from "../dataLayers/sta/sta";
import { useStationColors } from "../dataLayers/sta/useStaSensors";
import { useLayerTitle } from "../dataLayers/useLayerTitle";
import { BarChart } from "./BarChart";
import { BoxPlotChart } from "./BoxPlotChart";
import { createValueFormatter, SERIES_COLOR } from "./chartStyle";
import { ChartType } from "./chartTypes";
import { SeriesChart } from "./SeriesChart";
import { displayRange, TimeFilter, TimeRange } from "./timeRange";
import { WindRoseChart } from "./WindRoseChart";

const LOG = createLogger("dashboard:DatastreamChart");

type LoadState =
    | { kind: "loading" }
    | { kind: "error" }
    | { kind: "loaded"; observations: Observation[]; truncated: boolean };

export interface DatastreamChartProps {
    datastream: StaDatastreamProperties;
    chartType: ChartType;
    timeFilter: TimeFilter;
}

function TypedChart(props: {
    type: ChartType;
    observations: Observation[];
    label: string;
    unit: string | undefined;
    range: TimeRange;
    color: string;
}) {
    const { type, ...chartProps } = props;
    const { observations, label, unit, range, color } = chartProps;
    // The line chart draws several series, here it gets one.
    const series = useMemo(() => [{ label, color, observations }], [label, color, observations]);
    switch (type) {
        case "line":
            return <SeriesChart series={series} label={label} unit={unit} range={range} />;
        case "bar":
            return <BarChart {...chartProps} />;
        case "boxplot":
            return <BoxPlotChart {...chartProps} />;
        case "windrose":
            return <WindRoseChart {...chartProps} />;
    }
}

function Summary(props: { observations: Observation[]; unit: string | undefined; truncated: boolean }) {
    const { observations, unit, truncated } = props;
    const intl = useIntl();
    const stats = useMemo(() => {
        if (observations.length === 0) {
            return undefined;
        }
        let min = Infinity;
        let max = -Infinity;
        for (const { value } of observations) {
            min = Math.min(min, value);
            max = Math.max(max, value);
        }
        return { min, max, last: observations[observations.length - 1]?.value ?? NaN };
    }, [observations]);

    const format = createValueFormatter(intl, unit);
    return (
        <Text fontSize="sm" color="fg.muted">
            {intl.formatMessage({ id: "chart.count" }, { count: observations.length })}
            {stats && (
                <>
                    {" · "}
                    {/* The labels are bold (in the message), the values normal. */}
                    {intl.formatRichMessage(
                        { id: "chart.stats" },
                        { min: format(stats.min), max: format(stats.max), last: format(stats.last) }
                    )}
                </>
            )}
            {truncated && ` · ${intl.formatMessage({ id: "chart.truncated" })}`}
        </Text>
    );
}

/**
 * Loads the observations of a datastream for the time range and shows them in a chart of the given type.
 */
export function DatastreamChart({ datastream, chartType, timeFilter }: DatastreamChartProps) {
    const range = timeFilter.range;
    const intl = useIntl();
    const [state, setState] = useState<LoadState>({ kind: "loading" });

    useEffect(() => {
        const controller = new AbortController();
        setState({ kind: "loading" });
        fetchObservations(datastream.observationsUrl, range, controller.signal)
            .then(({ observations, truncated }) => setState({ kind: "loaded", observations, truncated }))
            .catch((error) => {
                if (!isAbortError(error)) {
                    LOG.error("Failed to load observations.", error);
                    setState({ kind: "error" });
                }
            });
        return () => controller.abort();
    }, [datastream.observationsUrl, range]);

    // Localized name from the data layer configuration; the datastream name comes from the server.
    const map = useMapModelValue();
    const name = useLayerTitle(map, datastream.dataLayerId) ?? datastream.name;
    const color = useStationColors(map)[datastream.dataLayerId] ?? SERIES_COLOR;
    const title = datastream.unit ? `${name} (${datastream.unit})` : name;
    const source = [datastream.name, datastream.thing].filter(Boolean).join(" · ");
    return (
        <Flex direction="column" height="100%" gap={1}>
            <Flex alignItems="baseline" gap={3} wrap="wrap">
                <Text fontWeight="semibold">{title}</Text>
                <Text fontSize="sm" color="fg.muted">
                    {source}
                </Text>
                {state.kind === "loaded" && (
                    <Summary observations={state.observations} unit={datastream.unit} truncated={state.truncated} />
                )}
            </Flex>
            <Box flex="1" minHeight={0} position="relative">
                {state.kind === "loading" && (
                    <Flex height="100%" alignItems="center" justifyContent="center" gap={2}>
                        <Spinner size="sm" />
                        <Text>{intl.formatMessage({ id: "chart.loading" })}</Text>
                    </Flex>
                )}
                {state.kind === "error" && <Text color="fg.error">{intl.formatMessage({ id: "chart.error" })}</Text>}
                {state.kind === "loaded" && state.observations.length === 0 && (
                    <Text color="fg.muted">{intl.formatMessage({ id: "chart.empty" })}</Text>
                )}
                {state.kind === "loaded" && state.observations.length > 0 && (
                    <TypedChart
                        type={chartType}
                        observations={state.observations}
                        label={title}
                        unit={datastream.unit}
                        range={displayRange(timeFilter, state.observations[0]?.time)}
                        color={color}
                    />
                )}
            </Box>
        </Flex>
    );
}
