import { Box, Collapsible, Flex, IconButton, Spacer, Tabs, Text } from "@chakra-ui/react";
import { useMapModelValue } from "@open-pioneer/map";
import { useIntl } from "open-pioneer:react-hooks";
import { Ref } from "react";
import { LuPanelBottomClose } from "react-icons/lu";
import { AnalysisSelection, AnalysisTab, withDefaultSensors } from "./charts/analysisSelection";
import { ChartType } from "./charts/chartTypes";
import { SensorChartView } from "./charts/SensorChartView";
import { TimeFilter } from "./charts/timeRange";
import { TimeRangeFilter } from "./charts/TimeRangeFilter";
import { useStaSensors } from "./dataLayers/useStaSensors";

export interface BottomPanelProps {
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
 * Shows the observations of a single sensor or compares two sensors, within the same time range.
 */
export function BottomPanel(props: BottomPanelProps) {
    const { id, open, onOpenChange, closeButtonRef } = props;
    const { timeFilter, onTimeFilterChange, onSelectionChange } = props;
    const intl = useIntl();
    const map = useMapModelValue();
    const sensors = useStaSensors(map);
    const selection = withDefaultSensors(
        props.selection,
        sensors.map((sensor) => sensor.id)
    );
    const collapseLabel = intl.formatMessage({ id: "panel.collapse" });

    const setCompare = (index: 0 | 1, sensorId: string) => {
        const compare: AnalysisSelection["compare"] = [...selection.compare];
        compare[index] = sensorId;
        onSelectionChange({ ...selection, compare });
    };
    const setChartType = (view: "single" | 0 | 1, chartType: ChartType) => {
        const { single, compare } = selection.charts;
        const charts: AnalysisSelection["charts"] =
            view === "single"
                ? { single: chartType, compare }
                : {
                      single,
                      compare: view === 0 ? [chartType, compare[1]] : [compare[0], chartType]
                  };
        onSelectionChange({ ...selection, charts });
    };

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
                        onValueChange={(e) => onSelectionChange({ ...selection, tab: e.value as AnalysisTab })}
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
                                    onClick={() => onOpenChange(false)}
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
                                        onChange={(single) => onSelectionChange({ ...selection, single })}
                                        chartType={selection.charts.single}
                                        onChartTypeChange={(type) => setChartType("single", type)}
                                        timeFilter={timeFilter}
                                        label={intl.formatMessage({ id: "panel.sensor.label" })}
                                    />
                                </Tabs.Content>
                                <Tabs.Content value="compare" flex="1" minHeight={0} pt={0}>
                                    <Flex direction={{ base: "column", md: "row" }} gap={6} height="100%">
                                        <Box flex="1" minWidth={0} minHeight={0}>
                                            <SensorChartView
                                                sensors={sensors}
                                                value={selection.compare[0]}
                                                onChange={(id) => setCompare(0, id)}
                                                chartType={selection.charts.compare[0]}
                                                onChartTypeChange={(type) => setChartType(0, type)}
                                                timeFilter={timeFilter}
                                                label={intl.formatMessage({
                                                    id: "panel.sensor.labelA"
                                                })}
                                            />
                                        </Box>
                                        <Box flex="1" minWidth={0} minHeight={0}>
                                            <SensorChartView
                                                sensors={sensors}
                                                value={selection.compare[1]}
                                                onChange={(id) => setCompare(1, id)}
                                                chartType={selection.charts.compare[1]}
                                                onChartTypeChange={(type) => setChartType(1, type)}
                                                timeFilter={timeFilter}
                                                label={intl.formatMessage({
                                                    id: "panel.sensor.labelB"
                                                })}
                                            />
                                        </Box>
                                    </Flex>
                                </Tabs.Content>
                            </>
                        )}
                    </Tabs.Root>
                </Box>
            </Collapsible.Content>
        </Collapsible.Root>
    );
}
