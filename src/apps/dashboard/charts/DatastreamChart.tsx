// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { Box, Flex, Spinner, Text } from "@chakra-ui/react";
import { createLogger, isAbortError } from "@open-pioneer/core";
import { useMapModelValue } from "@open-pioneer/map";
import { useIntl } from "open-pioneer:react-hooks";
import { useEffect, useMemo, useState } from "react";
import { fetchObservations, Observation, StaDatastreamProperties } from "../dataLayers/sta";
import { useLayerTitle } from "../dataLayers/useLayerTitle";
import { BarChart } from "./BarChart";
import { BoxPlotChart } from "./BoxPlotChart";
import { ChartType } from "./chartTypes";
import { ObservationChart } from "./ObservationChart";
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
            .then(({ observations, truncated }) =>
                setState({ kind: "loaded", observations, truncated })
            )
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
                    <Summary
                        observations={state.observations}
                        unit={datastream.unit}
                        truncated={state.truncated}
                    />
                )}
            </Flex>
            <Box flex="1" minHeight={0} position="relative">
                {state.kind === "loading" && (
                    <Flex height="100%" alignItems="center" justifyContent="center" gap={2}>
                        <Spinner size="sm" />
                        <Text>{intl.formatMessage({ id: "chart.loading" })}</Text>
                    </Flex>
                )}
                {state.kind === "error" && (
                    <Text color="fg.error">{intl.formatMessage({ id: "chart.error" })}</Text>
                )}
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
                    />
                )}
            </Box>
        </Flex>
    );
}

function TypedChart(props: {
    type: ChartType;
    observations: Observation[];
    label: string;
    unit: string | undefined;
    range: TimeRange;
}) {
    const { type, ...chartProps } = props;
    switch (type) {
        case "line":
            return <ObservationChart {...chartProps} />;
        case "bar":
            return <BarChart {...chartProps} />;
        case "boxplot":
            return <BoxPlotChart {...chartProps} />;
        case "windrose":
            return <WindRoseChart {...chartProps} />;
    }
}

function Summary(props: {
    observations: Observation[];
    unit: string | undefined;
    truncated: boolean;
}) {
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

    const format = (value: number) =>
        `${intl.formatNumber(value, { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;
    return (
        <Text fontSize="sm" color="fg.muted">
            {intl.formatMessage({ id: "chart.count" }, { count: observations.length })}
            {stats &&
                ` · ${intl.formatMessage(
                    { id: "chart.stats" },
                    { min: format(stats.min), max: format(stats.max), last: format(stats.last) }
                )}`}
            {truncated && ` · ${intl.formatMessage({ id: "chart.truncated" })}`}
        </Text>
    );
}
