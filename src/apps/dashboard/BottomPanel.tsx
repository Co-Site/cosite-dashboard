// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { Box, Collapsible, Flex, IconButton, Text } from "@chakra-ui/react";
import { SectionHeading, TitledSection } from "@open-pioneer/react-utils";
import { useIntl } from "open-pioneer:react-hooks";
import { LuChevronDown, LuChevronUp } from "react-icons/lu";
import { DatastreamChart } from "./charts/DatastreamChart";
import { TimeFilter } from "./charts/timeRange";
import { TimeRangeFilter } from "./charts/TimeRangeFilter";
import { StaDatastreamProperties } from "./dataLayers/sta";

export interface BottomPanelProps {
    open: boolean;
    onOpenChange(open: boolean): void;

    timeFilter: TimeFilter;
    onTimeFilterChange(filter: TimeFilter): void;

    /** The datastream selected in the map (if any). */
    datastream: StaDatastreamProperties | undefined;
}

/**
 * Collapsible panel at the bottom of the dashboard.
 * Shows the time filter and the chart of the datastream selected in the map.
 */
export function BottomPanel(props: BottomPanelProps) {
    const { open, onOpenChange, timeFilter, onTimeFilterChange, datastream } = props;
    const intl = useIntl();
    const toggleLabel = intl.formatMessage({ id: open ? "panel.collapse" : "panel.expand" });

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
                        <Flex
                            direction="column"
                            gap={3}
                            px={4}
                            pb={4}
                            height="35vh"
                            minHeight="260px"
                        >
                            <TimeRangeFilter value={timeFilter} onChange={onTimeFilterChange} />
                            <Box flex="1" minHeight={0}>
                                {datastream ? (
                                    <DatastreamChart
                                        datastream={datastream}
                                        range={timeFilter.range}
                                    />
                                ) : (
                                    <Text color="fg.muted">
                                        {intl.formatMessage({ id: "panel.placeholder" })}
                                    </Text>
                                )}
                            </Box>
                        </Flex>
                    </Collapsible.Content>
                </TitledSection>
            </Box>
        </Collapsible.Root>
    );
}
