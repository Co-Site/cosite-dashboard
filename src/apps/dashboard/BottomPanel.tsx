// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { Box, Collapsible, Flex, IconButton, Tabs, Text } from "@chakra-ui/react";
import { useMapModelValue } from "@open-pioneer/map";
import { SectionHeading, TitledSection } from "@open-pioneer/react-utils";
import { useIntl } from "open-pioneer:react-hooks";
import { LuChevronDown, LuChevronUp } from "react-icons/lu";
import { AnalysisSelection, AnalysisTab, withDefaultSensors } from "./charts/analysisSelection";
import { SensorChartView } from "./charts/SensorChartView";
import { TimeFilter } from "./charts/timeRange";
import { TimeRangeFilter } from "./charts/TimeRangeFilter";
import { useStaSensors } from "./dataLayers/useStaSensors";

export interface BottomPanelProps {
    open: boolean;
    onOpenChange(open: boolean): void;

    timeFilter: TimeFilter;
    onTimeFilterChange(filter: TimeFilter): void;

    /** Active tab and selected sensors (missing sensors are filled with defaults). */
    selection: AnalysisSelection;
    onSelectionChange(selection: AnalysisSelection): void;
}

/**
 * Collapsible panel at the bottom of the dashboard.
 * Shows the observations of a single sensor or compares two sensors, within the same time range.
 */
export function BottomPanel(props: BottomPanelProps) {
    const { open, onOpenChange, timeFilter, onTimeFilterChange, onSelectionChange } = props;
    const intl = useIntl();
    const map = useMapModelValue();
    const sensors = useStaSensors(map);
    const selection = withDefaultSensors(
        props.selection,
        sensors.map((sensor) => sensor.id)
    );
    const toggleLabel = intl.formatMessage({ id: open ? "panel.collapse" : "panel.expand" });

    const setCompare = (index: 0 | 1, sensorId: string) => {
        const compare: AnalysisSelection["compare"] = [...selection.compare];
        compare[index] = sensorId;
        onSelectionChange({ ...selection, compare });
    };

    return (
        <Collapsible.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
            <Box as="section" borderTopWidth="1px" backgroundColor="white" boxShadow="lg">
                <TitledSection
                    title={
                        <Flex alignItems="center" justifyContent="space-between" px={4} py={2}>
                            <SectionHeading size="md">
                                {intl.formatMessage({ id: "panel.title" })}
                            </SectionHeading>
                            <Collapsible.Trigger asChild>
                                <IconButton
                                    aria-label={toggleLabel}
                                    title={toggleLabel}
                                    variant="ghost"
                                    size="sm"
                                >
                                    {open ? <LuChevronDown /> : <LuChevronUp />}
                                </IconButton>
                            </Collapsible.Trigger>
                        </Flex>
                    }
                >
                    <Collapsible.Content>
                        <Tabs.Root
                            value={selection.tab}
                            onValueChange={(e) =>
                                onSelectionChange({ ...selection, tab: e.value as AnalysisTab })
                            }
                            variant="line"
                            size="sm"
                            // Only the active tab loads and renders its charts.
                            lazyMount
                            unmountOnExit
                            display="flex"
                            flexDirection="column"
                            gap={2}
                            px={4}
                            pb={4}
                            height="35vh"
                            minHeight="300px"
                        >
                            <Flex
                                alignItems="center"
                                justifyContent="space-between"
                                gap={3}
                                wrap="wrap"
                            >
                                <Tabs.List>
                                    <Tabs.Trigger value="single">
                                        {intl.formatMessage({ id: "panel.tabs.single" })}
                                    </Tabs.Trigger>
                                    <Tabs.Trigger value="compare">
                                        {intl.formatMessage({ id: "panel.tabs.compare" })}
                                    </Tabs.Trigger>
                                </Tabs.List>
                                <TimeRangeFilter value={timeFilter} onChange={onTimeFilterChange} />
                            </Flex>
                            {sensors.length === 0 ? (
                                <Text color="fg.muted">
                                    {intl.formatMessage({ id: "panel.sensor.none" })}
                                </Text>
                            ) : (
                                <>
                                    <Tabs.Content value="single" flex="1" minHeight={0} pt={0}>
                                        <SensorChartView
                                            sensors={sensors}
                                            value={selection.single}
                                            onChange={(single) =>
                                                onSelectionChange({ ...selection, single })
                                            }
                                            range={timeFilter.range}
                                            label={intl.formatMessage({ id: "panel.sensor.label" })}
                                        />
                                    </Tabs.Content>
                                    <Tabs.Content value="compare" flex="1" minHeight={0} pt={0}>
                                        <Flex
                                            direction={{ base: "column", md: "row" }}
                                            gap={6}
                                            height="100%"
                                        >
                                            <Box flex="1" minWidth={0} minHeight={0}>
                                                <SensorChartView
                                                    sensors={sensors}
                                                    value={selection.compare[0]}
                                                    onChange={(id) => setCompare(0, id)}
                                                    range={timeFilter.range}
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
                                                    range={timeFilter.range}
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
                    </Collapsible.Content>
                </TitledSection>
            </Box>
        </Collapsible.Root>
    );
}
