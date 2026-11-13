import { Flex, IconButton } from "@chakra-ui/react";
import { DefaultMapProvider, MapAnchor, MapContainer, useMapModel } from "@open-pioneer/map";
import { InitialExtent, ZoomIn, ZoomOut } from "@open-pioneer/map-navigation";
import { useIntl } from "open-pioneer:react-hooks";
import { useId, useState } from "react";
import { LuChartLine } from "react-icons/lu";
import { AnalysisPanel } from "./charts/AnalysisPanel";
import { AnalysisSelection, INITIAL_SELECTION } from "./charts/analysisSelection";
import { presetFilter, TimeFilter } from "./charts/timeRange";
import { StationPointStyles } from "./dataLayers/sta/StationPointStyles";
import { useMapClick } from "./mapClick/useMapClick";
import { MAP_ID } from "./services";
import { TocPanel } from "./toc/TocPanel";
import { useLocalizedDataLayers } from "./toc/useLocalizedDataLayers";
import { usePanelToggle } from "./usePanelToggle";

export function DashboardApp() {
    const intl = useIntl();
    const { map } = useMapModel(MAP_ID);
    useLocalizedDataLayers(map);
    const {
        open: panelOpen,
        setOpen: setPanelOpen,
        toggle: togglePanel,
        openButtonRef,
        closeButtonRef
    } = usePanelToggle(true);
    const panelId = useId();

    const [timeFilter, setTimeFilter] = useState<TimeFilter>(() => presetFilter("7d"));
    const [selection, setSelection] = useState<AnalysisSelection>(INITIAL_SELECTION);
    const showDatastream = (dataLayerId: string) => {
        setSelection((current) => ({ ...current, tab: "single", single: dataLayerId }));
        setPanelOpen(true);
    };
    useMapClick(map, { onShowDatastream: showDatastream });

    const openPanel = () => togglePanel(true);

    return (
        // Size container: the analysis panel's height is relative to the app (`cqh` units).
        <Flex height="100%" direction="column" overflow="hidden" containerType="size">
            {map && (
                <DefaultMapProvider map={map}>
                    <StationPointStyles />
                    <Flex flex="1" direction="column" position="relative" minHeight={0}>
                        <MapContainer aria-label={intl.formatMessage({ id: "ariaLabel.map" })}>
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
                        {/* Not in a MapAnchor: anchors clip their content, but the panel slides out to the left. */}
                        <TocPanel />
                        {!panelOpen && (
                            <IconButton
                                ref={openButtonRef}
                                position="absolute"
                                bottom="5px"
                                left="5px"
                                zIndex={1}
                                backgroundColor="white"
                                color="fg"
                                borderWidth="1px"
                                boxShadow="lg"
                                variant="outline"
                                aria-label={intl.formatMessage({ id: "panel.expand" })}
                                title={intl.formatMessage({ id: "panel.expand" })}
                                aria-controls={panelId}
                                aria-expanded={false}
                                onClick={openPanel}
                            >
                                <LuChartLine />
                            </IconButton>
                        )}
                    </Flex>
                    <AnalysisPanel
                        id={panelId}
                        open={panelOpen}
                        onOpenChange={togglePanel}
                        closeButtonRef={closeButtonRef}
                        timeFilter={timeFilter}
                        onTimeFilterChange={setTimeFilter}
                        selection={selection}
                        onSelectionChange={setSelection}
                    />
                </DefaultMapProvider>
            )}
        </Flex>
    );
}
