// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { createLogger } from "@open-pioneer/core";
import {
    GroupLayer,
    Layer,
    LayerFactory,
    MapModel,
    SimpleLayer,
    WMSLayer
} from "@open-pioneer/map";
import { LayerTocAttributes } from "@open-pioneer/toc";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Circle, Fill, Stroke, Style } from "ol/style";
import { localize } from "./localizedText";
import { createDatastreamFeature, fetchDatastream } from "./sta";
import {
    DataLayerGroupConfig,
    DataLayerNode,
    StaDatastreamLayerConfig,
    WmsDataLayerConfig
} from "./types";

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
    return context.layerFactory.create({
        type: WMSLayer,
        ...options,
        attributes: { ...options.attributes, toc: tocAttributes },
        url: config.endpoint,
        sublayers: config.wms.layers.map((name) => ({ name, title: name })),
        sourceOptions: {
            attributions: config.attribution
        }
    });
}

function createStaDatastreamLayer(
    config: StaDatastreamLayerConfig,
    { layerFactory, mapProjection, language }: DataLayerContext
): Layer {
    const source = new VectorSource({ attributions: config.attribution });
    fetchDatastream(config.endpoint)
        .then((datastream) => {
            const feature = createDatastreamFeature(
                config.id,
                config.endpoint,
                datastream,
                mapProjection
            );
            if (feature) {
                source.addFeature(feature);
            } else {
                LOG.warn(`Datastream '${config.endpoint}' has no location.`);
            }
        })
        .catch((error) => LOG.error(`Failed to load data layer '${config.id}'.`, error));

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
        title: localize(config.name, language),
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
        layer.setTitle(localize(config.name, language));
        layer.setDescription(localize(config.description, language) ?? "");
    }
}
