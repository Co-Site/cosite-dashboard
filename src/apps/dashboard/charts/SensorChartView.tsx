import { Box, chakra, Flex, NativeSelect, SegmentGroup, Spinner, Text } from "@chakra-ui/react";
import { Tooltip } from "@open-pioneer/chakra-snippets/tooltip";
import { useMapModelValue } from "@open-pioneer/map";
import { useIntl } from "open-pioneer:react-hooks";
import { ChangeEvent, useId } from "react";
import {
    StaSensor,
    useColocatedSensors,
    useDatastreamProperties,
    useSensorLoadFailed
} from "../dataLayers/sta/useStaSensors";
import { CHART_TYPE_ICONS, CHART_TYPES, ChartType } from "./chartTypes";
import { DatastreamChart } from "./DatastreamChart";
import { SensorTiles } from "./SensorTiles";
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

/** Chart type selection: icons, the name is shown as tooltip (and read by screen readers). */
function ChartTypeSelector(props: { value: ChartType; onChange(value: ChartType): void }) {
    const { value, onChange } = props;
    const intl = useIntl();
    // The tooltip must use the segment's id as trigger id, the segment group looks up its items by id.
    const baseId = useId();
    const itemId = (type: string) => `${baseId}-chart-type-${type}`;

    const changeType = (details: SegmentGroup.ValueChangeDetails) => {
        if (details.value) {
            onChange(details.value as ChartType);
        }
    };

    return (
        <SegmentGroup.Root
            ids={{ item: itemId }}
            size="xs"
            aria-label={intl.formatMessage({ id: "chartType.label" })}
            value={value}
            onValueChange={changeType}
        >
            <SegmentGroup.Indicator />
            {CHART_TYPES.map((type) => {
                const Icon = CHART_TYPE_ICONS[type];
                const name = intl.formatMessage({ id: `chartType.${type}` });
                return (
                    <Tooltip key={type} ids={{ trigger: itemId(type) }} content={name}>
                        <SegmentGroup.Item value={type}>
                            <SegmentGroup.ItemText>
                                <Icon aria-hidden />
                            </SegmentGroup.ItemText>
                            <SegmentGroup.ItemHiddenInput aria-label={name} />
                        </SegmentGroup.Item>
                    </Tooltip>
                );
            })}
        </SegmentGroup.Root>
    );
}

/**
 * Selection of a sensor and a chart type, and the chart of the sensor's observations.
 * Other sensors at the same site are shown as tiles next to the chart to switch between them.
 */
export function SensorChartView(props: SensorChartViewProps) {
    const { sensors, value, onChange, chartType, onChartTypeChange, timeFilter, label } = props;
    const intl = useIntl();
    const map = useMapModelValue();
    const selectId = useId();
    const datastream = useDatastreamProperties(map, value);
    const loadFailed = useSensorLoadFailed(map, value);
    const colocated = useColocatedSensors(map, value);

    const selectSensor = (event: ChangeEvent<HTMLSelectElement>) => onChange(event.currentTarget.value);

    return (
        <Flex direction="column" height="100%" gap={2} minWidth={0}>
            <Flex alignItems="center" gap={2} wrap="wrap">
                <chakra.label htmlFor={selectId} fontSize="sm" flexShrink={0}>
                    {label}
                </chakra.label>
                <NativeSelect.Root size="xs" maxWidth="sm">
                    <NativeSelect.Field id={selectId} value={value ?? ""} onChange={selectSensor}>
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
            <Flex flex="1" minHeight={0} gap={3}>
                <Box flex="1" minWidth={0}>
                    {datastream ? (
                        <DatastreamChart datastream={datastream} chartType={chartType} timeFilter={timeFilter} />
                    ) : loadFailed ? (
                        <Text color="fg.error">{intl.formatMessage({ id: "panel.sensor.error" })}</Text>
                    ) : value ? (
                        <Flex gap={2} alignItems="center">
                            <Spinner size="sm" />
                            <Text>{intl.formatMessage({ id: "panel.sensor.loading" })}</Text>
                        </Flex>
                    ) : (
                        <Text color="fg.muted">{intl.formatMessage({ id: "panel.sensor.placeholder" })}</Text>
                    )}
                </Box>
                {colocated.length > 0 && (
                    <SensorTiles
                        sensors={colocated}
                        onSelect={onChange}
                        label={intl.formatMessage({ id: "panel.colocated.label" })}
                    />
                )}
            </Flex>
        </Flex>
    );
}
