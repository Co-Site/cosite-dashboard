import { createLogger } from "@open-pioneer/core";
import { GroupLayer, Layer, LayerFactory, MapModel, SimpleLayer, WMSLayer } from "@open-pioneer/map";
import { LayerTocAttributes } from "@open-pioneer/toc";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Circle, Fill, Stroke, Style } from "ol/style";
import { localize } from "./localizedText";
import { createDatastreamFeature, fetchDatastream } from "./sta";
import { DataLayerGroupConfig, DataLayerNode, StaDatastreamLayerConfig, WmsDataLayerConfig } from "./types";
import { fetchWmsCapabilities } from "./wmsCapabilities";

const LOG = createLogger("dashboard:createDataLayer");

/** Key of the layer attribute that holds the original {@link DataLayerNode}. */
export const DATA_LAYER_ATTRIBUTE = "dataLayer";

/**
 * Creates a map layer from a data layer configuration entry (groups are created recursively).
 * Names and descriptions are localized for `context.language`, see {@link localizeDataLayers}.
 */
export function createDataLayer(config: DataLayerNode, context: DataLayerContext): Layer {
    const layer = createLayer(config, context);
    if (config.opacity != null) {
        layer.olLayer.setOpacity(config.opacity);
    }
    return layer;
}

/** Everything needed to create layers from the configuration. */
export interface DataLayerContext {
    layerFactory: LayerFactory;
    mapProjection: string;

    /** Language for names and descriptions, e.g. `"de"`. */
    language: string;
}

function createLayer(config: DataLayerNode, context: DataLayerContext): Layer {
    switch (config.type) {
        case "group":
            return createGroupLayer(config, context);
        case "wms":
            return createWmsLayer(config, context);
        case "sta-datastream":
            return createStaDatastreamLayer(config, context);
    }
}

function createGroupLayer(config: DataLayerGroupConfig, context: DataLayerContext): Layer {
    return context.layerFactory.create({
        type: GroupLayer,
        ...commonOptions(config, context),
        layers: config.layers.map((child) => createDataLayer(child, context))
    });
}

function createWmsLayer(config: WmsDataLayerConfig, context: DataLayerContext): Layer {
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
    if (config.name == null) {
        applyCapabilitiesTitles(layer, config);
    }
    reportFailedImageRequests(layer);
    return layer;
}

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

/** Uses the titles (and the abstract) from the capabilities for a WMS layer without configured name. */
function applyCapabilitiesTitles(layer: WMSLayer, config: WmsDataLayerConfig): void {
    fetchWmsCapabilities(config.endpoint)
        .then((capabilities) => {
            const find = (name: string | undefined) => capabilities.layers.find((l) => l.name === name);
            const [first] = config.wms.layers.map(find);
            if (first && config.wms.layers.length === 1) {
                layer.setTitle(first.title);
                if (config.description == null && first.abstract && first.abstract !== first.title) {
                    layer.setDescription(first.abstract);
                }
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

/** Time after which a datastream that has not been loaded counts as failed (instead of loading forever). */
const DATASTREAM_TIMEOUT_MS = 30_000;

function createStaDatastreamLayer(
    config: StaDatastreamLayerConfig,
    { layerFactory, mapProjection, language }: DataLayerContext
): Layer {
    const source = new VectorSource({ attributions: config.attribution });
    // The layer's `loadState` follows the source state, so the TOC and the sensor panel show failures.
    source.setState("loading");
    fetchDatastream(config.endpoint, AbortSignal.timeout(DATASTREAM_TIMEOUT_MS))
        .then((datastream) => {
            const feature = createDatastreamFeature(config.id, config.endpoint, datastream, mapProjection);
            if (feature) {
                source.addFeature(feature);
                source.setState("ready");
            } else {
                // The dashboard is explored on the map: a sensor without location is not available.
                LOG.warn(`Datastream '${config.endpoint}' has no location.`);
                source.setState("error");
            }
        })
        .catch((error) => {
            LOG.error(`Failed to load data layer '${config.id}'.`, error);
            source.setState("error");
        });

    return layerFactory.create({
        type: SimpleLayer,
        ...commonOptions(config, { language }),
        healthCheck: config.endpoint,
        olLayer: new VectorLayer({ source, style: SENSOR_STYLE })
    });
}

function commonOptions(config: DataLayerNode, { language }: Pick<DataLayerContext, "language">) {
    return {
        id: config.id,
        title: localize(config.name, language) ?? defaultTitle(config),
        description: localize(config.description, language),
        visible: config.visible ?? true,
        attributes: { [DATA_LAYER_ATTRIBUTE]: config }
    };
}

const SENSOR_STYLE = new Style({
    image: new Circle({
        radius: 8,
        fill: new Fill({ color: "#dd6b20" }),
        stroke: new Stroke({ color: "#ffffff", width: 2 })
    })
});

/**
 * Updates names and descriptions of all data layers of the map to the given language.
 */
export function localizeDataLayers(map: MapModel, language: string): void {
    for (const layer of map.layers.getRecursiveLayers({ filter: "operational" })) {
        const config = layer.attributes[DATA_LAYER_ATTRIBUTE] as DataLayerNode | undefined;
        if (!config) {
            continue;
        }
        // Titles and descriptions from the capabilities are kept, they are not translated.
        if (config.name != null) {
            layer.setTitle(localize(config.name, language) ?? defaultTitle(config));
        }
        if (config.description != null) {
            layer.setDescription(localize(config.description, language) ?? "");
        }
    }
}

/** Title until the capabilities have been loaded (WMS layers may have no configured name). */
function defaultTitle(config: DataLayerNode): string {
    return config.type === "wms" ? config.wms.layers.join(", ") : config.id;
}
