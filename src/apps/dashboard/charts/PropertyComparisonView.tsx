import { Box, chakra, Flex, NativeSelect, Spinner, Text } from "@chakra-ui/react";
import { useMapModelValue } from "@open-pioneer/map";
import { useIntl } from "open-pioneer:react-hooks";
import { ChangeEvent, useId, useMemo } from "react";
import { ObservedPropertyGroup } from "../dataLayers/sta/observedProperties";
import { useFailedSensors, useLoadedDatastreams, useStaSensors } from "../dataLayers/sta/useStaSensors";
import { seriesColor } from "./chartStyle";
import { Series, SeriesChart } from "./SeriesChart";
import { displayRange, TimeFilter } from "./timeRange";
import { useSeriesObservations } from "./useSeriesObservations";

const NO_SENSORS: string[] = [];

export interface PropertyComparisonViewProps {
    /** Observed properties to choose from. */
    properties: ObservedPropertyGroup[];

    /** Key of the chosen observed property. */
    value: string | undefined;
    onChange(key: string): void;

    timeFilter: TimeFilter;
}

/**
 * Selection of an observed property; all sensors that measure it are compared in one chart.
 */
export function PropertyComparisonView(props: PropertyComparisonViewProps) {
    const { properties, value, onChange, timeFilter } = props;
    const intl = useIntl();
    const map = useMapModelValue();
    const selectId = useId();

    const sensorIds = properties.find((property) => property.key === value)?.sensorIds ?? NO_SENSORS;
    const sensors = useStaSensors(map);
    const datastreams = useLoadedDatastreams(map, sensorIds);
    const failedSensors = useFailedSensors(map, sensorIds);
    const states = useSeriesObservations(datastreams, timeFilter.range);

    const series = useMemo(
        () =>
            datastreams.flatMap(({ dataLayerId }): Series[] => {
                const state = states[dataLayerId];
                if (state?.kind !== "loaded") {
                    return [];
                }
                return [
                    {
                        id: dataLayerId,
                        // Localized name from the data layer configuration.
                        label: sensors.find((sensor) => sensor.id === dataLayerId)?.title ?? dataLayerId,
                        color: seriesColor(sensorIds.indexOf(dataLayerId)),
                        observations: state.observations
                    }
                ];
            }),
        [datastreams, states, sensors, sensorIds]
    );

    // Names of the observed properties are translated by the app; unknown keys are shown as they are.
    const propertyName = (key: string) => intl.formatMessage({ id: `observedProperty.${key}`, defaultMessage: key });
    const selectProperty = (event: ChangeEvent<HTMLSelectElement>) => onChange(event.currentTarget.value);

    if (properties.length === 0 || value === undefined) {
        return <Text color="fg.muted">{intl.formatMessage({ id: "panel.property.none" })}</Text>;
    }

    const failed = failedSensors.length + datastreams.filter((d) => states[d.dataLayerId]?.kind === "error").length;
    const loading = series.length + failed < sensorIds.length;
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
                        {properties.map(({ key }) => (
                            <option key={key} value={key}>
                                {propertyName(key)}
                            </option>
                        ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                </NativeSelect.Root>
            </Flex>
            <Flex direction="column" flex="1" minHeight={0} gap={1}>
                <Text fontWeight="semibold">{title}</Text>
                <Box flex="1" minHeight={0} position="relative">
                    {series.length > 0 ? (
                        firstTimes.length > 0 || loading ? (
                            <SeriesChart series={series} label={title} unit={unit} range={range} />
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
        </Flex>
    );
}
