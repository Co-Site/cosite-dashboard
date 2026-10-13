import { Box, CloseButton, Flex, Text } from "@chakra-ui/react";
import { useIntl } from "open-pioneer:react-hooks";
import { ReactNode } from "react";

export interface PopupFrameProps {
    title: string;
    /** Maximum height in pixels; the content scrolls if the popup would be larger. */
    maxHeight: number;
    onClose(): void;
    children?: ReactNode;
}

/**
 * Frame of the map popups: a header with title and close button, and scrollable content.
 */
export function PopupFrame({ title, maxHeight, onClose, children }: PopupFrameProps) {
    const intl = useIntl();
    return (
        <Flex
            direction="column"
            backgroundColor="white"
            borderWidth="1px"
            borderRadius="lg"
            boxShadow="lg"
            minWidth="220px"
            maxWidth="320px"
            maxHeight={`${maxHeight}px`}
        >
            {/* Header stays visible, only the content below scrolls. */}
            <Flex justifyContent="space-between" alignItems="center" gap={2} px={3} pt={3} pb={1}>
                <Text fontWeight="bold">{title}</Text>
                <CloseButton
                    size="2xs"
                    aria-label={intl.formatMessage({ id: "featureInfo.close" })}
                    onClick={onClose}
                />
            </Flex>
            <Box px={3} pb={3} overflowY="auto" minHeight={0}>
                {children}
            </Box>
        </Flex>
    );
}
