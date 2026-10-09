// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { Box, Flex } from "@chakra-ui/react";
import { Toc } from "@cosite/toc";
import { DefaultMapProvider, MapAnchor, MapContainer, useMapModel } from "@open-pioneer/map";
import { InitialExtent, ZoomIn, ZoomOut } from "@open-pioneer/map-navigation";
import { SectionHeading, TitledSection } from "@open-pioneer/react-utils";
import { useIntl } from "open-pioneer:react-hooks";
import { useId, useState } from "react";
import { BottomPanel } from "./BottomPanel";
import { presetFilter, TimeFilter } from "./charts/timeRange";
import { StaDatastreamProperties } from "./dataLayers/sta";
import { useMapClick } from "./mapClick/useMapClick";
import { MAP_ID } from "./services";
import { LanguageSelector } from "./toc/LanguageSelector";
import { layerMenuContent } from "./toc/LayerOpacitySlider";
import { useLocalizedDataLayers } from "./toc/useLocalizedDataLayers";

export function DashboardApp() {
    const intl = useIntl();
    const { map } = useMapModel(MAP_ID);
    useLocalizedDataLayers(map);
    const [panelOpen, setPanelOpen] = useState(true);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>(() => presetFilter("7d"));
    const [datastream, setDatastream] = useState<StaDatastreamProperties>();
    useMapClick(map, {
        onDatastreamClick(clicked) {
            setDatastream(clicked);
            setPanelOpen(true);
        }
    });

    return (
        <Flex height="100%" direction="column" overflow="hidden">
            {map && (
                <DefaultMapProvider map={map}>
                    <Flex flex="1" direction="column" position="relative" minHeight={0}>
                        <MapContainer aria-label={intl.formatMessage({ id: "ariaLabel.map" })}>
                            <MapAnchor position="top-left" horizontalGap={5} verticalGap={5}>
                                <TocPanel />
                            </MapAnchor>
                            <MapAnchor position="bottom-right" horizontalGap={10} verticalGap={30}>
                                <Flex
                                    role="toolbar"
                                    aria-label={intl.formatMessage({ id: "ariaLabel.mapTools" })}
                                    direction="column"
                                    gap={1}
                                    padding={1}
                                >
                                    <InitialExtent />
                                    <ZoomIn />
                                    <ZoomOut />
                                </Flex>
                            </MapAnchor>
                        </MapContainer>
                    </Flex>
                    <BottomPanel
                        open={panelOpen}
                        onOpenChange={setPanelOpen}
                        timeFilter={timeFilter}
                        onTimeFilterChange={setTimeFilter}
                        datastream={datastream}
                    />
                </DefaultMapProvider>
            )}
        </Flex>
    );
}

function TocPanel() {
    const intl = useIntl();
    const headingId = useId();
    return (
        <Box
            role="region"
            aria-labelledby={headingId}
            backgroundColor="white"
            borderWidth="1px"
            borderRadius="lg"
            padding={3}
            boxShadow="lg"
            width="300px"
            maxHeight="60vh"
            overflowY="auto"
        >
            <TitledSection
                title={
                    <Flex alignItems="center" justifyContent="space-between" gap={2} mb={2}>
                        <SectionHeading id={headingId} size="md">
                            {intl.formatMessage({ id: "tocTitle" })}
                        </SectionHeading>
                        <LanguageSelector />
                    </Flex>
                }
            >
                <Toc collapsibleGroups layerMenuContent={layerMenuContent} />
            </TitledSection>
        </Box>
    );
}
