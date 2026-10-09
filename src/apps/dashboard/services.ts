// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { createLogger } from "@open-pioneer/core";
import {
    MapConfig,
    MapConfigProvider,
    MapConfigProviderOptions,
    SimpleLayer
} from "@open-pioneer/map";
import TileLayer from "ol/layer/Tile";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import { createDataLayer } from "./dataLayers/createDataLayer";
import { DATA_LAYERS_URL, loadDataLayers } from "./dataLayers/loadDataLayers";
import { DataLayerConfig } from "./dataLayers/types";

const LOG = createLogger("dashboard:MainMapProvider");

export const MAP_ID = "main";

const PROJECTION = "EPSG:3857";

// Cologne
const [INITIAL_X = 0, INITIAL_Y = 0] = fromLonLat([6.9988, 50.9371], PROJECTION);

export class MainMapProvider implements MapConfigProvider {
    mapId = MAP_ID;

    async getMapConfig({ layerFactory }: MapConfigProviderOptions): Promise<MapConfig> {
        const dataLayers = await loadDataLayersSafe();
        return {
            initialView: {
                kind: "position",
                center: { x: INITIAL_X, y: INITIAL_Y },
                zoom: 9
            },
            projection: PROJECTION,
            baseLayers: [
                layerFactory.create({
                    type: SimpleLayer,
                    title: "OpenStreetMap",
                    olLayer: new TileLayer({
                        source: new OSM(),
                        properties: { title: "OSM" }
                    })
                })
            ],
            layers: dataLayers.map((config) => createDataLayer(config, layerFactory, PROJECTION))
        };
    }
}

/** The map should still start (with base layers only) if the data layer configuration is broken. */
async function loadDataLayersSafe(): Promise<DataLayerConfig[]> {
    try {
        return await loadDataLayers();
    } catch (error) {
        LOG.error(`Failed to load data layers from ${DATA_LAYERS_URL}.`, error);
        return [];
    }
}
