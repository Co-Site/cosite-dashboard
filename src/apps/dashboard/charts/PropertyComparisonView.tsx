import { Box, chakra, Flex, NativeSelect, Spinner, Text } from "@chakra-ui/react";
import { useMapModelValue } from "@open-pioneer/map";
import { useIntl } from "open-pioneer:react-hooks";
import { ChangeEvent, useId, useMemo } from "react";
import {
    useFailedSensors,
    useLoadedDatastreams,
    useStaSensors,
    useStationColors
} from "../dataLayers/sta/useStaSensors";
import { SERIES_COLOR } from "./chartStyle";
import { SensorTiles } from "./SensorTiles";
import { Series, SeriesChart } from "./SeriesChart";
import { displayRange, TimeFilter } from "./timeRange";
import { useSeriesObservations } from "./useSeriesObservations";

const NO_SENSORS: string[] = [];

export interface PropertyComparisonViewProps {
    /** Observed properties to choose from: their keys, each with its sensors (data layer ids). */
    properties: Record<string, string[]>;

    /** Key of the chosen observed property. */
    value: string | undefined;
    onChange(key: string): void;

    /** Sensors (data layer ids) that are switched off. */
    hidden: string[];
    onToggle(sensorId: string): void;

    timeFilter: TimeFilter;
}

/**
 * Selection of an observed property; all sensors that measure it are compared in one chart.
 * The sensors are tiles next to the chart, a click shows or hides a sensor. Lines and tiles have the colour of
 * the sensor's station.
 */
export function PropertyComparisonView(props: PropertyComparisonViewProps) {
    const { properties, value, onChange, hidden, onToggle, timeFilter } = props;
    const intl = useIntl();
    const map = useMapModelValue();
    const selectId = useId();

    const sensorIds = (value !== undefined && properties[value]) || NO_SENSORS;
    const sensors = useStaSensors(map);
    const datastreams = useLoadedDatastreams(map, sensorIds);
    const failedSensors = useFailedSensors(map, sensorIds);
    const states = useSeriesObservations(datastreams, timeFilter.range);

    const colors = useStationColors(map);
    // The series of the sensors that are loaded and switched on.
    const series = useMemo(
        () =>
            datastreams.flatMap(({ dataLayerId }): Series[] => {
                const observations = states[dataLayerId];
                if (!Array.isArray(observations) || hidden.includes(dataLayerId)) {
                    return [];
                }
                return [
                    {
                        // Localized name from the data layer configuration.
                        label: sensors.find((sensor) => sensor.id === dataLayerId)?.title ?? dataLayerId,
                        color: colors[dataLayerId] ?? SERIES_COLOR,
                        observations
                    }
                ];
            }),
        [datastreams, states, hidden, sensors, colors]
    );

    // Names of the observed properties are translated by the app; unknown keys are shown as they are.
    const propertyName = (key: string) => intl.formatMessage({ id: `observedProperty.${key}`, defaultMessage: key });
    const selectProperty = (event: ChangeEvent<HTMLSelectElement>) => onChange(event.currentTarget.value);

    if (value === undefined) {
        return <Text color="fg.muted">{intl.formatMessage({ id: "panel.property.none" })}</Text>;
    }

    const unavailable = [
        ...failedSensors,
        ...sensorIds.filter((id) => states[id] === "error" && !failedSensors.includes(id))
    ];
    const loadedCount = sensorIds.filter((id) => Array.isArray(states[id])).length;
    const loading = loadedCount + unavailable.length < sensorIds.length;
    // All sensors of an observed property have the same unit (the configuration is responsible for that).
    const unit = datastreams[0]?.unit;
    const name = propertyName(value);
    const title = unit ? `${name} (${unit})` : name;
    const firstTimes = series.flatMap(({ observations }) => (observations[0] ? [observations[0].time] : []));
    const range = displayRange(timeFilter, firstTimes.length > 0 ? Math.min(...firstTimes) : undefined);

    return (
        <Flex direction="column" height="100%" gap={2} minWidth={0}>
            <Flex alignItems="center" gap={2} wrap="wrap">
                <chakra.label htmlFor={selectId} fontSize="sm" flexShrink={0}>
                    {intl.formatMessage({ id: "panel.property.label" })}
                </chakra.label>
                <NativeSelect.Root size="xs" maxWidth="sm">
                    <NativeSelect.Field id={selectId} value={value} onChange={selectProperty}>
                        {Object.keys(properties).map((key) => (
                            <option key={key} value={key}>
                                {propertyName(key)}
                            </option>
                        ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                </NativeSelect.Root>
            </Flex>
            <Flex flex="1" minHeight={0} gap={3}>
                <Flex direction="column" flex="1" minWidth={0} gap={1}>
                    <Text fontWeight="semibold">{title}</Text>
                    <Box flex="1" minHeight={0} position="relative">
                        {loadedCount > 0 ? (
                            firstTimes.length > 0 || loading ? (
                                <SeriesChart series={series} label={title} unit={unit} range={range} seriesNames />
                            ) : (
                                <Text color="fg.muted">{intl.formatMessage({ id: "chart.empty" })}</Text>
                            )
                        ) : loading ? (
                            <Flex height="100%" alignItems="center" justifyContent="center" gap={2}>
                                <Spinner size="sm" />
                                <Text>{intl.formatMessage({ id: "chart.loading" })}</Text>
                            </Flex>
                        ) : (
                            <Text color="fg.error">{intl.formatMessage({ id: "chart.error" })}</Text>
                        )}
                    </Box>
                </Flex>
                <SensorTiles
                    sensors={datastreams}
                    onSelect={onToggle}
                    label={intl.formatMessage({ id: "panel.property.sensors" })}
                    hidden={hidden}
                    colors={colors}
                    unavailable={unavailable}
                />
            </Flex>
        </Flex>
    );
}
