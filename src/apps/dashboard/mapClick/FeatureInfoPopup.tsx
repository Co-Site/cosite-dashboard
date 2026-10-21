import { Box, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { MapModel } from "@open-pioneer/map";
import { PackageIntl } from "@open-pioneer/runtime";
import { useIntl } from "open-pioneer:react-hooks";
import { localize } from "../dataLayers/localizedText";
import { useLayerTitle } from "../dataLayers/useLayerTitle";
import { FeatureInfoResult, FeatureInfoValue } from "./featureInfo";
import { PopupFrame } from "./PopupFrame";
import { WmsLegend } from "./WmsLegend";

export interface FeatureInfoPopupProps {
    map: MapModel;
    /** `undefined` while loading. */
    results: FeatureInfoResult[] | undefined;
    /** Maximum height in pixels; the content scrolls if the popup would be larger. */
    maxHeight: number;
    onClose(): void;
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

function LayerResult({ map, result }: { map: MapModel; result: FeatureInfoResult }) {
    const intl = useIntl();
    const layerTitle = useLayerTitle(map, result.layerId) ?? result.layerId;
    const language = new Intl.Locale(intl.locale).language;
    if (result.error) {
        return (
            <Box>
                <Text color="fg.error">
                    {layerTitle}: {intl.formatMessage({ id: "featureInfo.error" })}
                </Text>
                <WmsLegend map={map} layerId={result.layerId} />
            </Box>
        );
    }
    // The legend is also shown if there are no values at the clicked position.
    return (
        <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={1}>
                {layerTitle}
            </Text>
            {result.features.map((feature) => (
                <Box as="dl" key={feature.id} fontSize="sm">
                    {feature.values.map((value) => (
                        <Flex key={value.property} justifyContent="space-between" gap={4}>
                            <Text as="dt">{localize(value.label, language)}</Text>
                            <Text as="dd" textAlign="right">
                                {formatValue(intl, value)}
                            </Text>
                        </Flex>
                    ))}
                </Box>
            ))}
            <WmsLegend map={map} layerId={result.layerId} />
        </Box>
    );
}

export function FeatureInfoPopup({ map, results, maxHeight, onClose }: FeatureInfoPopupProps) {
    const intl = useIntl();
    const hasFeatures = results?.some((result) => result.features.length > 0);
    return (
        <PopupFrame title={intl.formatMessage({ id: "featureInfo.title" })} maxHeight={maxHeight} onClose={onClose}>
            {!results && (
                <Flex gap={2} alignItems="center">
                    <Spinner size="sm" />
                    <Text>{intl.formatMessage({ id: "featureInfo.loading" })}</Text>
                </Flex>
            )}
            {results && !hasFeatures && <Text color="fg.muted">{intl.formatMessage({ id: "featureInfo.empty" })}</Text>}
            <Stack gap={3}>
                {results?.map((result) => (
                    <LayerResult key={result.layerId} map={map} result={result} />
                ))}
            </Stack>
        </PopupFrame>
    );
}
