/*
 * What all data layer types share: the link from a map layer back to its configuration, the options every layer gets
 * (id, localized title and description, visibility) and the title taken from a service's capabilities.
 */
import { AnyLayer, Layer, LayerFactory } from "@open-pioneer/map";
import { localize } from "./config/localizedText";
import { DataLayerConfig, DataLayerNode } from "./config/types";

/** Key of the layer attribute that holds the original {@link DataLayerNode}. */
const DATA_LAYER_ATTRIBUTE = "dataLayer";

/** The configuration a map layer was created from, or `undefined` for other layers (e.g. base layers). */
export function getDataLayerConfig(layer: AnyLayer): DataLayerNode | undefined {
    return layer.attributes[DATA_LAYER_ATTRIBUTE] as DataLayerNode | undefined;
}

/** Everything needed to create layers from the configuration. */
export interface DataLayerContext {
    layerFactory: LayerFactory;
    mapProjection: string;

    /** Language for names and descriptions, e.g. `"de"`. */
    language: string;
}

/** Title until the capabilities have been loaded (WMS and WFS layers may have no configured name). */
function defaultTitle(config: DataLayerNode): string {
    switch (config.type) {
        case "wms":
            return config.wms.layers.join(", ");
        case "wfs":
            return config.wfs.featureType;
        default:
            return config.id;
    }
}

export function localizedTitle(config: DataLayerNode, language: string): string {
    return localize(config.name, language) ?? defaultTitle(config);
}

export function commonOptions(config: DataLayerNode, { language }: Pick<DataLayerContext, "language">) {
    return {
        id: config.id,
        title: localizedTitle(config, language),
        description: localize(config.description, language),
        visible: config.visible ?? true,
        attributes: { [DATA_LAYER_ATTRIBUTE]: config }
    };
}

/**
 * Uses title and abstract of the layer from the capabilities if the configuration has no name
 * (the abstract only if there is no configured description and it says more than the title).
 */
export function applyCapabilitiesTitle(
    layer: Layer,
    config: DataLayerConfig,
    entry: { title: string; abstract: string | undefined }
): void {
    if (config.name != null) {
        return;
    }
    layer.setTitle(entry.title);
    if (config.description == null && entry.abstract && entry.abstract !== entry.title) {
        layer.setDescription(entry.abstract);
    }
}
