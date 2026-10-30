import { GroupLayer, Layer, MapModel } from "@open-pioneer/map";
import { localize } from "./config/localizedText";
import { DataLayerGroupConfig, DataLayerNode } from "./config/types";
import { commonOptions, DataLayerContext, getDataLayerConfig, localizedTitle } from "./dataLayerBase";
import { createWfsLayer } from "./ows/wfsLayer";
import { createWmsLayer } from "./ows/wmsLayer";
import { createStaDatastreamLayer } from "./sta/staLayer";

function createGroupLayer(config: DataLayerGroupConfig, context: DataLayerContext): Layer {
    return context.layerFactory.create({
        type: GroupLayer,
        ...commonOptions(config, context),
        layers: config.layers.map((child) => createDataLayer(child, context))
    });
}

function createLayer(config: DataLayerNode, context: DataLayerContext): Layer {
    switch (config.type) {
        case "group":
            return createGroupLayer(config, context);
        case "wms":
            return createWmsLayer(config, context);
        case "wfs":
            return createWfsLayer(config, context);
        case "sta-datastream":
            return createStaDatastreamLayer(config, context);
    }
}

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

/**
 * Updates names and descriptions of all data layers of the map to the given language.
 */
export function localizeDataLayers(map: MapModel, language: string): void {
    for (const layer of map.layers.getRecursiveLayers({ filter: "operational" })) {
        const config = getDataLayerConfig(layer);
        if (!config) {
            continue;
        }
        // Titles and descriptions from the capabilities are kept, they are not translated.
        if (config.name != null) {
            layer.setTitle(localizedTitle(config, language));
        }
        if (config.description != null) {
            layer.setDescription(localize(config.description, language) ?? "");
        }
    }
}
