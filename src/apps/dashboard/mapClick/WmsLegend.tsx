import { Box, Image, Stack, Text } from "@chakra-ui/react";
import { MapModel, WMSLayer } from "@open-pioneer/map";
import { useReactiveSnapshot } from "@open-pioneer/reactivity";
import { useIntl } from "open-pioneer:react-hooks";
import { useState } from "react";
import { legendUrls } from "./legendUrls";

/**
 * Legend image(s) of a WMS layer, as configured in the data layer configuration (`wms.legend`).
 */
export function WmsLegend({ map, layerId }: { map: MapModel; layerId: string }) {
    const intl = useIntl();
    // Legends that fail to load are hidden (e.g. broken legend URLs in a service's capabilities).
    const [failed, setFailed] = useState<string[]>([]);
    const urls = useLegendUrls(map, layerId).filter((url) => !failed.includes(url));
    if (!urls.length) {
        return null;
    }
    const title = intl.formatMessage({ id: "featureInfo.legend" });

    const hideLegend = (url: string) => setFailed((current) => [...current, url]);

    return (
        <Box mt={2}>
            <Text fontSize="xs" color="fg.muted" mb={1}>
                {title}
            </Text>
            <Stack gap={2} alignItems="flex-start">
                {urls.map((url) => (
                    <Image key={url} src={url} alt={title} maxWidth="100%" onError={() => hideLegend(url)} />
                ))}
            </Stack>
        </Box>
    );
}

/** Legend URLs of the layer (see {@link legendUrls}); updates when the capabilities have been loaded. */
function useLegendUrls(map: MapModel, layerId: string): string[] {
    return useReactiveSnapshot(() => {
        const layer = map.layers.getLayerById(layerId);
        return layer instanceof WMSLayer ? legendUrls(layer) : [];
    }, [map, layerId]);
}
