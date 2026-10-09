// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { Box, CloseButton, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { PackageIntl } from "@open-pioneer/runtime";
import { useIntl } from "open-pioneer:react-hooks";
import { FeatureInfoResult, FeatureInfoValue } from "./featureInfo";

export interface FeatureInfoPopupProps {
    /** `undefined` while loading. */
    results: FeatureInfoResult[] | undefined;
    onClose(): void;
}

export function FeatureInfoPopup({ results, onClose }: FeatureInfoPopupProps) {
    const intl = useIntl();
    const hasFeatures = results?.some((result) => result.features.length > 0);
    return (
        <Box
            backgroundColor="white"
            borderWidth="1px"
            borderRadius="lg"
            boxShadow="lg"
            padding={3}
            minWidth="220px"
            maxWidth="320px"
            maxHeight="300px"
            overflowY="auto"
        >
            <Flex justifyContent="space-between" alignItems="center" mb={1} gap={2}>
                <Text fontWeight="bold">{intl.formatMessage({ id: "featureInfo.title" })}</Text>
                <CloseButton
                    size="2xs"
                    aria-label={intl.formatMessage({ id: "featureInfo.close" })}
                    onClick={onClose}
                />
            </Flex>
            {!results && (
                <Flex gap={2} alignItems="center">
                    <Spinner size="sm" />
                    <Text>{intl.formatMessage({ id: "featureInfo.loading" })}</Text>
                </Flex>
            )}
            {results && !hasFeatures && (
                <Text color="fg.muted">{intl.formatMessage({ id: "featureInfo.empty" })}</Text>
            )}
            <Stack gap={3}>
                {results?.map((result) => (
                    <LayerResult key={result.layerId} result={result} />
                ))}
            </Stack>
        </Box>
    );
}

function LayerResult({ result }: { result: FeatureInfoResult }) {
    const intl = useIntl();
    if (result.error) {
        return (
            <Text color="fg.error">
                {result.layerTitle}: {intl.formatMessage({ id: "featureInfo.error" })}
            </Text>
        );
    }
    if (result.features.length === 0) {
        return null;
    }
    return (
        <Box>
            <Text fontSize="sm" color="fg.muted" mb={1}>
                {result.layerTitle}
            </Text>
            {result.features.map((feature) => (
                <Box as="dl" key={feature.id} fontSize="sm">
                    {feature.values.map((value) => (
                        <Flex key={value.label} justifyContent="space-between" gap={4}>
                            <Text as="dt">{value.label}</Text>
                            <Text as="dd" fontWeight="semibold" textAlign="right">
                                {formatValue(intl, value)}
                            </Text>
                        </Flex>
                    ))}
                </Box>
            ))}
        </Box>
    );
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function formatValue(intl: PackageIntl, { value, unit }: FeatureInfoValue): string {
    let text: string;
    if (typeof value === "number") {
        text = intl.formatNumber(value, { maximumFractionDigits: 1 });
    } else if (typeof value === "string" && ISO_DATE.test(value)) {
        text = intl.formatDate(value, { dateStyle: "short", timeStyle: "short" });
    } else {
        text = value == null ? "–" : String(value);
    }
    return unit ? `${text} ${unit}` : text;
}
