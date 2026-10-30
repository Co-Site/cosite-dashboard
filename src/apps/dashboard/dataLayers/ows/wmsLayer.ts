import { createLogger } from "@open-pioneer/core";
import { Layer, WMSLayer } from "@open-pioneer/map";
import { LayerTocAttributes } from "@open-pioneer/toc";
import { WmsDataLayerConfig } from "../config/types";
import { applyCapabilitiesTitle, commonOptions, DataLayerContext } from "../dataLayerBase";
import { describeLayer } from "./owsService";
import {
    chooseFeatureInfoFormat,
    fetchWmsCapabilities,
    WmsCapabilities,
    WmsCapabilitiesLayer
} from "./wmsCapabilities";

const LOG = createLogger("dashboard:wmsLayer");

/**
 * `@open-pioneer/map` loads WMS images itself and only logs failed requests (e.g. HTTP 500): the image is never
 * completed, so OpenLayers neither fires `imageloaderror` nor retries. Failing such an image lets the TOC warn about it
 * (see `toc/LayerLoadWarning.tsx`).
 */
function reportFailedImageRequests(layer: WMSLayer): void {
    const source = layer.olSource;
    if (!source) {
        return;
    }
    const load = source.getImageLoadFunction();
    source.setImageLoadFunction((wrapper, src) => {
        // The original function returns a promise that resolves after success and after failure.
        void Promise.resolve(load(wrapper, src) as unknown).then(() => {
            const image = wrapper.getImage();
            if (image instanceof HTMLImageElement && !image.src) {
                image.src = "data:,"; // not an image: fires the error event
            }
        });
    });
}

/**
 * Uses the titles from the capabilities for the sublayers and, if the layer has no configured name,
 * for the layer itself (together with the abstract).
 */
function applyWmsCapabilitiesTitles(layer: WMSLayer, config: WmsDataLayerConfig): void {
    fetchWmsCapabilities(config.endpoint)
        .then((capabilities) => {
            const find = (name: string | undefined) => capabilities.layers.find((l) => l.name === name);
            const [first] = config.wms.layers.map(find);
            if (first && config.wms.layers.length === 1) {
                applyCapabilitiesTitle(layer, config, first);
            }
            for (const sublayer of layer.sublayers.getRecursiveLayers()) {
                const title = find(sublayer.name)?.title;
                if (title) {
                    sublayer.setTitle(title);
                }
            }
        })
        .catch((error) => LOG.warn(`Failed to load capabilities for the title of '${config.id}'.`, error));
}

export function createWmsLayer(config: WmsDataLayerConfig, context: DataLayerContext): Layer {
    const options = commonOptions(config, context);
    // A single WMS layer is represented by the data layer itself, no need to list it separately.
    const tocAttributes: LayerTocAttributes = {
        listMode: config.wms.layers.length === 1 ? "hide-children" : "show"
    };
    const layer = context.layerFactory.create({
        type: WMSLayer,
        ...options,
        attributes: { ...options.attributes, toc: tocAttributes },
        url: config.endpoint,
        sublayers: config.wms.layers.map((name) => ({ name, title: name })),
        // Temporary layers were added from capabilities the dashboard has loaded already.
        fetchCapabilities: !config.temporary,
        sourceOptions: {
            // Never fall back to the service's access constraints or fees (long texts or bare URLs).
            attributions: config.attribution ?? []
        }
    });
    if (config.name == null || config.wms.layers.length > 1) {
        applyWmsCapabilitiesTitles(layer, config);
    }
    reportFailedImageRequests(layer);
    return layer;
}

/** Number of the next WMS layer the user adds, for its id (session only). */
let nextUserLayer = 1;

/** The configuration of a WMS layer the user adds, from the capabilities of its service. */
export function userWmsLayerConfig(
    endpoint: string,
    capabilities: WmsCapabilities,
    layer: WmsCapabilitiesLayer
): WmsDataLayerConfig {
    const format = layer.queryable ? chooseFeatureInfoFormat(capabilities.featureInfoFormats) : undefined;
    return {
        id: `user-wms-${nextUserLayer++}`,
        type: "wms",
        temporary: true,
        name: layer.title,
        description: describeLayer(capabilities, layer),
        endpoint,
        attribution: layer.attribution,
        wms: {
            layers: [layer.name],
            featureInfo: format ? { format } : { enabled: false }
        }
    };
}
