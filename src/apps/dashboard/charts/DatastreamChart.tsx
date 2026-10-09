// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { Box, Flex, Spinner, Text } from "@chakra-ui/react";
import { createLogger, isAbortError } from "@open-pioneer/core";
import { useIntl } from "open-pioneer:react-hooks";
import { useEffect, useMemo, useState } from "react";
import { fetchObservations, Observation, StaDatastreamProperties } from "../dataLayers/sta";
import { ObservationChart } from "./ObservationChart";
import { TimeRange } from "./timeRange";

const LOG = createLogger("dashboard:DatastreamChart");

type LoadState =
    | { kind: "loading" }
    | { kind: "error" }
    | { kind: "loaded"; observations: Observation[]; truncated: boolean };

export interface DatastreamChartProps {
    datastream: StaDatastreamProperties;
    range: TimeRange;
}

/**
 * Loads the observations of a datastream for the time range and shows them as a line chart.
 */
export function DatastreamChart({ datastream, range }: DatastreamChartProps) {
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

    const title = datastream.unit ? `${datastream.name} (${datastream.unit})` : datastream.name;
    return (
        <Flex direction="column" height="100%" gap={1}>
            <Flex alignItems="baseline" gap={3} wrap="wrap">
                <Text fontWeight="semibold">{title}</Text>
                {datastream.thing && (
                    <Text fontSize="sm" color="fg.muted">
                        {datastream.thing}
                    </Text>
                )}
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
                    <ObservationChart
                        observations={state.observations}
                        label={title}
                        unit={datastream.unit}
                        range={range}
                    />
                )}
            </Box>
        </Flex>
    );
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
