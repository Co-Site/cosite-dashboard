import { Box, Collapsible, Flex, IconButton, Spacer, Tabs, TabsValueChangeDetails, Text } from "@chakra-ui/react";
import { useMapModelValue } from "@open-pioneer/map";
import { useIntl } from "open-pioneer:react-hooks";
import { Ref } from "react";
import { LuPanelBottomClose } from "react-icons/lu";
import { useObservedProperties, useStaSensors } from "../dataLayers/sta/useStaSensors";
import {
    AnalysisSelection,
    AnalysisTab,
    AnalysisView,
    withChartType,
    withCompareSensor,
    withDefaultProperty,
    withDefaultSensors
} from "./analysisSelection";
import { ChartType } from "./chartTypes";
import { PropertyComparisonView } from "./PropertyComparisonView";
import { SensorChartView } from "./SensorChartView";
import { TimeFilter } from "./timeRange";
import { TimeRangeFilter } from "./TimeRangeFilter";

/** The two halves of the compare view and the label of their sensor selection. */
const COMPARE_HALVES = [
    { index: 0, label: "panel.sensor.labelA" },
    { index: 1, label: "panel.sensor.labelB" }
] as const;

export interface AnalysisPanelProps {
    /** Id of the panel element (e.g. for `aria-controls`). */
    id: string;

    /** When closed, the panel is hidden completely (see the open button in `DashboardApp`). */
    open: boolean;
    onOpenChange(open: boolean): void;

    /** Ref to the button that closes the panel (for focus management). */
    closeButtonRef?: Ref<HTMLButtonElement>;

    timeFilter: TimeFilter;
    onTimeFilterChange(filter: TimeFilter): void;

    /** Active tab and selected sensors (missing sensors are filled with defaults). */
    selection: AnalysisSelection;
    onSelectionChange(selection: AnalysisSelection): void;
}

/**
 * Collapsible analysis panel at the bottom of the dashboard (collapsed, only an icon remains, see `DashboardApp`).
 * Shows the observations of a single sensor, compares two sensors or compares all sensors of an observed property,
 * within the same time range.
 */
export function AnalysisPanel(props: AnalysisPanelProps) {
    const { id, open, onOpenChange, closeButtonRef } = props;
    const { timeFilter, onTimeFilterChange, onSelectionChange } = props;
    const intl = useIntl();
    const map = useMapModelValue();
    const sensors = useStaSensors(map);
    const properties = useObservedProperties(map);
    const selection = withDefaultProperty(
        withDefaultSensors(
            props.selection,
            sensors.map((sensor) => sensor.id)
        ),
        properties.map((property) => property.key)
    );
    const collapseLabel = intl.formatMessage({ id: "panel.collapse" });

    const setCompare = (index: 0 | 1, sensorId: string) =>
        onSelectionChange(withCompareSensor(selection, index, sensorId));
    const setChartType = (view: AnalysisView, chartType: ChartType) =>
        onSelectionChange(withChartType(selection, view, chartType));
    const changeTab = (details: TabsValueChangeDetails) =>
        onSelectionChange({ ...selection, tab: details.value as AnalysisTab });
    const closePanel = () => onOpenChange(false);
    const selectSingle = (single: string) => onSelectionChange({ ...selection, single });
    const changeSingleChartType = (type: ChartType) => setChartType("single", type);
    const selectProperty = (key: string) =>
        onSelectionChange({ ...selection, property: { ...selection.property, key } });

    return (
        <Collapsible.Root open={open}>
            <Collapsible.Content>
                <Box
                    as="section"
                    id={id}
                    aria-label={intl.formatMessage({ id: "panel.title" })}
                    borderTopWidth="1px"
                    backgroundColor="white"
                    boxShadow="lg"
                >
                    <Tabs.Root
                        value={selection.tab}
                        onValueChange={changeTab}
                        variant="line"
                        size="lg"
                        // Only the active tab loads and renders its charts.
                        lazyMount
                        unmountOnExit
                        display="flex"
                        flexDirection="column"
                        gap={2}
                        px={4}
                        pt={2}
                        pb={4}
                        // 45 % of the app's height (the app is the size container, see DashboardApp).
                        height="45cqh"
                        minHeight="320px"
                    >
                        <Flex direction="column" alignItems="flex-start" gap={2}>
                            <Flex alignSelf="stretch" alignItems="center" gap={2}>
                                <Tabs.List>
                                    <Tabs.Trigger value="single">
                                        {intl.formatMessage({ id: "panel.tabs.single" })}
                                    </Tabs.Trigger>
                                    <Tabs.Trigger value="compare">
                                        {intl.formatMessage({ id: "panel.tabs.compare" })}
                                    </Tabs.Trigger>
                                    <Tabs.Trigger value="property">
                                        {intl.formatMessage({ id: "panel.tabs.property" })}
                                    </Tabs.Trigger>
                                </Tabs.List>
                                <Spacer />
                                <IconButton
                                    ref={closeButtonRef}
                                    aria-label={collapseLabel}
                                    title={collapseLabel}
                                    aria-controls={id}
                                    aria-expanded={true}
                                    variant="ghost"
                                    size="sm"
                                    onClick={closePanel}
                                >
                                    <LuPanelBottomClose />
                                </IconButton>
                            </Flex>
                            <TimeRangeFilter value={timeFilter} onChange={onTimeFilterChange} />
                        </Flex>
                        {sensors.length === 0 ? (
                            <Text color="fg.muted">{intl.formatMessage({ id: "panel.sensor.none" })}</Text>
                        ) : (
                            <>
                                <Tabs.Content value="single" flex="1" minHeight={0} pt={0}>
                                    <SensorChartView
                                        sensors={sensors}
                                        value={selection.single}
                                        onChange={selectSingle}
                                        chartType={selection.charts.single}
                                        onChartTypeChange={changeSingleChartType}
                                        timeFilter={timeFilter}
                                        label={intl.formatMessage({ id: "panel.sensor.label" })}
                                    />
                                </Tabs.Content>
                                <Tabs.Content value="compare" flex="1" minHeight={0} pt={0}>
                                    <Flex direction={{ base: "column", md: "row" }} gap={6} height="100%">
                                        {COMPARE_HALVES.map(({ index, label }) => (
                                            <Box key={index} flex="1" minWidth={0} minHeight={0}>
                                                <SensorChartView
                                                    sensors={sensors}
                                                    value={selection.compare[index]}
                                                    onChange={(id) => setCompare(index, id)}
                                                    chartType={selection.charts.compare[index]}
                                                    onChartTypeChange={(type) => setChartType(index, type)}
                                                    timeFilter={timeFilter}
                                                    label={intl.formatMessage({ id: label })}
                                                />
                                            </Box>
                                        ))}
                                    </Flex>
                                </Tabs.Content>
                                <Tabs.Content value="property" flex="1" minHeight={0} pt={0}>
                                    <PropertyComparisonView
                                        properties={properties}
                                        value={selection.property.key}
                                        onChange={selectProperty}
                                    />
                                </Tabs.Content>
                            </>
                        )}
                    </Tabs.Root>
                </Box>
            </Collapsible.Content>
        </Collapsible.Root>
    );
}
