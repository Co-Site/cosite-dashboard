import { Box, Image, Stack, Text } from "@chakra-ui/react";
import { MapModel, WMSLayer } from "@open-pioneer/map";
import { useReactiveSnapshot } from "@open-pioneer/reactivity";
import { useIntl } from "open-pioneer:react-hooks";
import { DATA_LAYER_ATTRIBUTE } from "../dataLayers/createDataLayer";
import { DataLayerNode, WmsLegendConfig } from "../dataLayers/types";

/**
 * Legend image(s) of a WMS layer, as configured in the data layer configuration (`wms.legend`).
 */
export function WmsLegend({ map, layerId }: { map: MapModel; layerId: string }) {
    const intl = useIntl();
    const urls = useLegendUrls(map, layerId);
    if (!urls.length) {
        return null;
    }
    const title = intl.formatMessage({ id: "featureInfo.legend" });
    return (
        <Box mt={2}>
            <Text fontSize="xs" color="fg.muted" mb={1}>
                {title}
            </Text>
            <Stack gap={2} alignItems="flex-start">
                {urls.map((url) => (
                    <Image key={url} src={url} alt={title} maxWidth="100%" />
                ))}
            </Stack>
        </Box>
    );
}

/**
 * Legend URLs of the layer: the configured URL or the URLs from the capabilities (one per sublayer),
 * extended by the configured parameters. Updates when the capabilities have been loaded.
 */
function useLegendUrls(map: MapModel, layerId: string): string[] {
    const urls = useReactiveSnapshot(() => {
        const layer = map.layers.getLayerById(layerId);
        if (!(layer instanceof WMSLayer)) {
            return [];
        }
        const config = getLegendConfig(layer);
        if (!config || config.enabled === false) {
            return [];
        }
        const sources = config.url
            ? [config.url]
            : layer.sublayers
                  .getRecursiveLayers()
                  // Fall back to a standard GetLegendGraphic request if the capabilities
                  // do not provide a legend URL (or could not be loaded).
                  .flatMap((sublayer) => {
                      const url =
                          sublayer.legend ??
                          (sublayer.name ? getLegendGraphicUrl(layer.url, sublayer.name) : undefined);
                      return url ? [url] : [];
                  });
        return sources.map((url) => withParams(url, config.params));
    }, [map, layerId]);
    return urls;
}

function getLegendConfig(layer: WMSLayer): WmsLegendConfig | undefined {
    const config = layer.attributes[DATA_LAYER_ATTRIBUTE] as DataLayerNode | undefined;
    if (config?.type !== "wms") {
        return undefined;
    }
    return config.wms.legend ?? {};
}

/** Builds a `GetLegendGraphic` request (supported by GeoServer, MapServer, QGIS Server, ...). */
export function getLegendGraphicUrl(serviceUrl: string, layerName: string): string {
    const url = new URL(serviceUrl);
    url.searchParams.set("SERVICE", "WMS");
    url.searchParams.set("VERSION", "1.3.0");
    url.searchParams.set("REQUEST", "GetLegendGraphic");
    url.searchParams.set("FORMAT", "image/png");
    url.searchParams.set("LAYER", layerName);
    return url.href;
}

function withParams(url: string, params: Record<string, string> | undefined): string {
    if (!params) {
        return url;
    }
    const result = new URL(url);
    for (const [key, value] of Object.entries(params)) {
        result.searchParams.set(key, value);
    }
    return result.href;
}
