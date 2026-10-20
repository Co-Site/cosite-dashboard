import { Box, Image, Stack, Text } from "@chakra-ui/react";
import { MapModel, WMSLayer } from "@open-pioneer/map";
import { useReactiveSnapshot } from "@open-pioneer/reactivity";
import { useIntl } from "open-pioneer:react-hooks";
import { useState } from "react";
import { DATA_LAYER_ATTRIBUTE } from "../dataLayers/createDataLayer";
import { DataLayerNode, WmsLegendConfig } from "../dataLayers/types";
import { peekWmsCapabilities } from "../dataLayers/wmsCapabilities";

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
    return (
        <Box mt={2}>
            <Text fontSize="xs" color="fg.muted" mb={1}>
                {title}
            </Text>
            <Stack gap={2} alignItems="flex-start">
                {urls.map((url) => (
                    <Image
                        key={url}
                        src={url}
                        alt={title}
                        maxWidth="100%"
                        onError={() => setFailed((current) => [...current, url])}
                    />
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
        if (!config || config.legend.enabled === false) {
            return [];
        }
        const sources = config.legend.url
            ? [config.legend.url]
            : layer.sublayers
                  .getRecursiveLayers()
                  // Legend URL from the capabilities (loaded by the map, or by the dashboard for the user's
                  // layers), otherwise a standard GetLegendGraphic request.
                  .flatMap((sublayer) => {
                      const url =
                          sublayer.legend ??
                          (config.temporary ? capabilitiesLegendUrl(layer.url, sublayer.name) : undefined) ??
                          (sublayer.name ? getLegendGraphicUrl(layer.url, sublayer.name) : undefined);
                      return url ? [url] : [];
                  });
        return sources.map((url) => withParams(url, config.legend.params));
    }, [map, layerId]);
    return urls;
}

function getLegendConfig(layer: WMSLayer): { legend: WmsLegendConfig; temporary: boolean } | undefined {
    const config = layer.attributes[DATA_LAYER_ATTRIBUTE] as DataLayerNode | undefined;
    if (config?.type !== "wms") {
        return undefined;
    }
    return { legend: config.wms.legend ?? {}, temporary: !!config.temporary };
}

/**
 * Legend URL from the capabilities loaded by the dashboard. Only used for the user's layers:
 * the map does not load their capabilities, and configured layers keep their configured legend.
 */
function capabilitiesLegendUrl(serviceUrl: string, layerName: string | undefined): string | undefined {
    return peekWmsCapabilities(serviceUrl)?.layers.find((layer) => layer.name === layerName)?.legendUrl;
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

export function withParams(url: string, params: Record<string, string> | undefined): string {
    if (!params) {
        return url;
    }
    const result = new URL(url);
    for (const [key, value] of Object.entries(params)) {
        // WMS parameter names are case-insensitive: replace e.g. `width` from the capabilities by `WIDTH`.
        for (const existing of [...result.searchParams.keys()]) {
            if (existing.toLowerCase() === key.toLowerCase()) {
                result.searchParams.delete(existing);
            }
        }
        result.searchParams.set(key, value);
    }
    return result.href;
}
