// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { Box, chakra, Flex, NativeSelect, SegmentGroup, Spinner, Text } from "@chakra-ui/react";
import { useMapModelValue } from "@open-pioneer/map";
import { useIntl } from "open-pioneer:react-hooks";
import { useId } from "react";
import { StaSensor, useDatastreamProperties } from "../dataLayers/useStaSensors";
import { CHART_TYPES, ChartType } from "./chartTypes";
import { DatastreamChart } from "./DatastreamChart";
import { TimeFilter } from "./timeRange";

export interface SensorChartViewProps {
    /** Sensors to choose from. */
    sensors: StaSensor[];

    /** Id of the selected sensor (data layer id). */
    value: string | undefined;
    onChange(sensorId: string): void;

    chartType: ChartType;
    onChartTypeChange(chartType: ChartType): void;

    timeFilter: TimeFilter;

    /** Label of the sensor selection. */
    label: string;
}

/**
 * Selection of a sensor and a chart type, and the chart of the sensor's observations.
 */
export function SensorChartView(props: SensorChartViewProps) {
    const { sensors, value, onChange, chartType, onChartTypeChange, timeFilter, label } = props;
    const intl = useIntl();
    const map = useMapModelValue();
    const selectId = useId();
    const datastream = useDatastreamProperties(map, value);

    return (
        <Flex direction="column" height="100%" gap={2} minWidth={0}>
            <Flex alignItems="center" gap={2} wrap="wrap">
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
                <ChartTypeSelector value={chartType} onChange={onChartTypeChange} />
            </Flex>
            <Box flex="1" minHeight={0}>
                {datastream ? (
                    <DatastreamChart
                        datastream={datastream}
                        chartType={chartType}
                        timeFilter={timeFilter}
                    />
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

function ChartTypeSelector(props: { value: ChartType; onChange(value: ChartType): void }) {
    const { value, onChange } = props;
    const intl = useIntl();
    return (
        <SegmentGroup.Root
            size="xs"
            aria-label={intl.formatMessage({ id: "chartType.label" })}
            value={value}
            onValueChange={(details) => {
                if (details.value) {
                    onChange(details.value as ChartType);
                }
            }}
        >
            <SegmentGroup.Indicator />
            {CHART_TYPES.map((type) => (
                <SegmentGroup.Item key={type} value={type}>
                    <SegmentGroup.ItemText>
                        {intl.formatMessage({ id: `chartType.${type}` })}
                    </SegmentGroup.ItemText>
                    <SegmentGroup.ItemHiddenInput />
                </SegmentGroup.Item>
            ))}
        </SegmentGroup.Root>
    );
}
