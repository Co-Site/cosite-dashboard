// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { Box, chakra, Flex, NativeSelect, Spinner, Text } from "@chakra-ui/react";
import { useMapModelValue } from "@open-pioneer/map";
import { useIntl } from "open-pioneer:react-hooks";
import { useId } from "react";
import { StaSensor, useDatastreamProperties } from "../dataLayers/useStaSensors";
import { DatastreamChart } from "./DatastreamChart";
import { TimeFilter } from "./timeRange";

export interface SensorChartViewProps {
    /** Sensors to choose from. */
    sensors: StaSensor[];

    /** Id of the selected sensor (data layer id). */
    value: string | undefined;
    onChange(sensorId: string): void;

    timeFilter: TimeFilter;

    /** Label of the sensor selection. */
    label: string;
}

/**
 * Selection of a sensor and the chart of its observations.
 */
export function SensorChartView(props: SensorChartViewProps) {
    const { sensors, value, onChange, timeFilter, label } = props;
    const intl = useIntl();
    const map = useMapModelValue();
    const selectId = useId();
    const datastream = useDatastreamProperties(map, value);

    return (
        <Flex direction="column" height="100%" gap={2} minWidth={0}>
            <Flex alignItems="center" gap={2}>
                <chakra.label htmlFor={selectId} fontSize="sm" flexShrink={0}>
                    {label}
                </chakra.label>
                <NativeSelect.Root size="xs" maxWidth="sm">
                    <NativeSelect.Field
                        id={selectId}
                        value={value ?? ""}
                        onChange={(e) => onChange(e.currentTarget.value)}
                    >
                        {value === undefined && (
                            <option value="" disabled>
                                {intl.formatMessage({ id: "panel.sensor.placeholder" })}
                            </option>
                        )}
                        {sensors.map((sensor) => (
                            <option key={sensor.id} value={sensor.id}>
                                {sensor.title}
                            </option>
                        ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                </NativeSelect.Root>
            </Flex>
            <Box flex="1" minHeight={0}>
                {datastream ? (
                    <DatastreamChart datastream={datastream} timeFilter={timeFilter} />
                ) : value ? (
                    <Flex gap={2} alignItems="center">
                        <Spinner size="sm" />
                        <Text>{intl.formatMessage({ id: "panel.sensor.loading" })}</Text>
                    </Flex>
                ) : (
                    <Text color="fg.muted">
                        {intl.formatMessage({ id: "panel.sensor.placeholder" })}
                    </Text>
                )}
            </Box>
        </Flex>
    );
}
