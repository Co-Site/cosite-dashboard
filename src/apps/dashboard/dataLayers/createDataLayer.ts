// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { LayerTocAttributes } from "@cosite/toc";
import { createLogger } from "@open-pioneer/core";
import { GroupLayer, Layer, LayerFactory, SimpleLayer, WMSLayer } from "@open-pioneer/map";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Circle, Fill, Stroke, Style } from "ol/style";
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
 */
export function createDataLayer(
    config: DataLayerNode,
    layerFactory: LayerFactory,
    mapProjection: string
): Layer {
    const layer = createLayer(config, layerFactory, mapProjection);
    if (config.opacity != null) {
        layer.olLayer.setOpacity(config.opacity);
    }
    return layer;
}

function createLayer(
    config: DataLayerNode,
    layerFactory: LayerFactory,
    mapProjection: string
): Layer {
    switch (config.type) {
        case "group":
            return createGroupLayer(config, layerFactory, mapProjection);
        case "wms":
            return createWmsLayer(config, layerFactory);
        case "sta-datastream":
            return createStaDatastreamLayer(config, layerFactory, mapProjection);
    }
}

function createGroupLayer(
    config: DataLayerGroupConfig,
    layerFactory: LayerFactory,
    mapProjection: string
): Layer {
    return layerFactory.create({
        type: GroupLayer,
        ...commonOptions(config),
        layers: config.layers.map((child) => createDataLayer(child, layerFactory, mapProjection))
    });
}

function createWmsLayer(config: WmsDataLayerConfig, layerFactory: LayerFactory): Layer {
    const options = commonOptions(config);
    // A single WMS layer is represented by the data layer itself, no need to list it separately.
    const tocAttributes: LayerTocAttributes = {
        listMode: config.wms.layers.length === 1 ? "hide-children" : "show"
    };
    return layerFactory.create({
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
    layerFactory: LayerFactory,
    mapProjection: string
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
        ...commonOptions(config),
        healthCheck: config.endpoint,
        olLayer: new VectorLayer({ source, style: SENSOR_STYLE })
    });
}

function commonOptions(config: DataLayerNode) {
    return {
        id: config.id,
        title: config.name,
        description: config.description,
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
