// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { Box, Flex, IconButton } from "@chakra-ui/react";
import { SectionHeading, TitledSection } from "@open-pioneer/react-utils";
import { Toc } from "@open-pioneer/toc";
import { useIntl } from "open-pioneer:react-hooks";
import { useEffect, useId, useRef, useState } from "react";
import { LuLayers, LuPanelLeftClose } from "react-icons/lu";
import { LanguageSelector } from "./LanguageSelector";

/**
 * Panel with the TOC (basemaps and layers) and the language switch.
 * Can be collapsed to the left; a small button remains to open it again.
 */
export function TocPanel() {
    const intl = useIntl();
    const headingId = useId();
    const panelId = useId();
    const [open, setOpen] = useState(true);

    // Move the focus to the button that is visible after toggling.
    const openButtonRef = useRef<HTMLButtonElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const toggled = useRef(false);
    useEffect(() => {
        if (toggled.current) {
            (open ? closeButtonRef : openButtonRef).current?.focus();
        }
    }, [open]);
    const toggle = (value: boolean) => {
        toggled.current = true;
        setOpen(value);
    };

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
                                onClick={() => toggle(false)}
                            >
                                <LuPanelLeftClose />
                            </IconButton>
                        </Flex>
                    }
                >
                    <Toc collapsibleGroups />
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
                    onClick={() => toggle(true)}
                >
                    <LuLayers />
                </IconButton>
            )}
        </Box>
    );
}
