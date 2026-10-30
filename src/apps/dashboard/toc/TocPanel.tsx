import { Box, Flex, IconButton } from "@chakra-ui/react";
import { SectionHeading, TitledSection } from "@open-pioneer/react-utils";
import { Toc, TocApi, TocReadyEvent } from "@open-pioneer/toc";
import { useIntl } from "open-pioneer:react-hooks";
import { useId, useState } from "react";
import { LuLayers, LuPanelLeftClose } from "react-icons/lu";
import { usePanelToggle } from "../usePanelToggle";
import { AddServiceLayer } from "./AddServiceLayer";
import { LanguageSelector } from "./LanguageSelector";
import { layerItemContent } from "./layerItemContent";
import { TocItemExtensions } from "./TocItemExtensions";
import { WMS_SERVICE } from "./userServices";

/** Lucide "info" icon (circle with an i), as used by `react-icons/lu`. */
const INFO_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';

/**
 * The TOC shows a ⋮ button for layers with a description; it only opens the description.
 * The TOC has no option for the icon, so it is replaced by an info icon via CSS
 * (drawn in the button's text color through a mask). Only affects the TOC, not the popover's close button.
 * If the class name changes in a TOC update, the original ⋮ is shown again.
 */
const INFO_ICON_CSS = {
    "& .toc-layer-item-details-button svg": { display: "none" },
    "& .toc-layer-item-details-button::before": {
        content: '""',
        width: "1rem",
        height: "1rem",
        backgroundColor: "currentColor",
        mask: `url("data:image/svg+xml,${encodeURIComponent(INFO_ICON_SVG)}") center / contain no-repeat`
    }
};

/**
 * Panel with the TOC (basemaps and layers) and the language switch.
 * Can be collapsed to the left; a small button remains to open it again.
 */
export function TocPanel() {
    const intl = useIntl();
    const headingId = useId();
    const panelId = useId();
    const { open, toggle, openButtonRef, closeButtonRef } = usePanelToggle(true);
    const [tocApi, setTocApi] = useState<TocApi>();

    const collapse = () => toggle(false);
    const expand = () => toggle(true);
    const connectToc = (event: TocReadyEvent) => setTocApi(event.api);
    const disconnectToc = () => setTocApi(undefined);

    const expandLabel = intl.formatMessage({ id: "toc.expand" });
    const collapseLabel = intl.formatMessage({ id: "toc.collapse" });
    return (
        // Overlay at the top left of the map. The wrapper lets clicks through to the map,
        // only the panel and the button receive them.
        <Box position="absolute" top="5px" left="5px" zIndex={1} pointerEvents="none">
            <Box
                id={panelId}
                role="region"
                pointerEvents="auto"
                aria-labelledby={headingId}
                inert={!open}
                backgroundColor="white"
                borderWidth="1px"
                borderRadius="lg"
                padding={3}
                boxShadow="lg"
                width="300px"
                maxHeight="60vh"
                overflowY="auto"
                transform={open ? "translateX(0)" : "translateX(calc(-100% - 2rem))"}
                transition="transform 0.25s ease"
                css={{ "@media (prefers-reduced-motion: reduce)": { transition: "none" } }}
            >
                <TitledSection
                    title={
                        <Flex alignItems="center" gap={2} mb={2}>
                            <SectionHeading id={headingId} size="md" flex="1">
                                {intl.formatMessage({ id: "tocTitle" })}
                            </SectionHeading>
                            <LanguageSelector />
                            <IconButton
                                ref={closeButtonRef}
                                size="xs"
                                variant="ghost"
                                aria-label={collapseLabel}
                                title={collapseLabel}
                                aria-controls={panelId}
                                aria-expanded={true}
                                onClick={collapse}
                            >
                                <LuPanelLeftClose />
                            </IconButton>
                        </Flex>
                    }
                >
                    <AddServiceLayer service={WMS_SERVICE} />
                    <Box css={INFO_ICON_CSS}>
                        <Toc collapsibleGroups initiallyCollapsed onReady={connectToc} onDisposed={disconnectToc} />
                    </Box>
                    <TocItemExtensions api={tocApi} render={layerItemContent} />
                </TitledSection>
            </Box>
            {!open && (
                <IconButton
                    ref={openButtonRef}
                    position="absolute"
                    top={0}
                    left={0}
                    pointerEvents="auto"
                    backgroundColor="white"
                    color="fg"
                    borderWidth="1px"
                    boxShadow="lg"
                    variant="outline"
                    aria-label={expandLabel}
                    title={expandLabel}
                    aria-controls={panelId}
                    aria-expanded={false}
                    onClick={expand}
                >
                    <LuLayers />
                </IconButton>
            )}
        </Box>
    );
}
