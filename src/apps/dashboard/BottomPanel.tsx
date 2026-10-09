// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { Box, Collapsible, Flex, IconButton, Text } from "@chakra-ui/react";
import { SectionHeading, TitledSection } from "@open-pioneer/react-utils";
import { useIntl } from "open-pioneer:react-hooks";
import { useState } from "react";
import { LuChevronDown, LuChevronUp } from "react-icons/lu";

/**
 * Collapsible panel at the bottom of the dashboard.
 * Will later show charts for the location clicked in the map.
 */
export function BottomPanel() {
    const intl = useIntl();
    const [open, setOpen] = useState(true);
    const toggleLabel = intl.formatMessage({ id: open ? "panel.collapse" : "panel.expand" });

    return (
        <Collapsible.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
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
                        <Box px={4} pb={4} height="30vh" overflowY="auto">
                            <Text color="fg.muted">
                                {intl.formatMessage({ id: "panel.placeholder" })}
                            </Text>
                        </Box>
                    </Collapsible.Content>
                </TitledSection>
            </Box>
        </Collapsible.Root>
    );
}
