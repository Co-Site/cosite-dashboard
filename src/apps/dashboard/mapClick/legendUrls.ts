import { WMSLayer } from "@open-pioneer/map";
import { getDataLayerConfig } from "../dataLayers/createDataLayer";
import { WmsLegendConfig } from "../dataLayers/types";
import { peekWmsCapabilities } from "../dataLayers/wmsCapabilities";

function getLegendConfig(layer: WMSLayer): { legend: WmsLegendConfig; temporary: boolean } | undefined {
    const config = getDataLayerConfig(layer);
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

/**
 * Legend URLs of the layer: the configured URL or the URLs from the capabilities (one per sublayer),
 * extended by the configured parameters. Reads reactive layer state: inside `useReactiveSnapshot` the result updates
 * when the capabilities have been loaded.
 */
export function legendUrls(layer: WMSLayer): string[] {
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
}
