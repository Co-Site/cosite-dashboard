import { createLogger } from "@open-pioneer/core";
import { MapConfig, MapConfigProvider, MapConfigProviderOptions, SimpleLayer } from "@open-pioneer/map";
import { LocaleService, ServiceOptions } from "@open-pioneer/runtime";
import TileLayer from "ol/layer/Tile";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import { createDataLayer } from "./dataLayers/createDataLayer";
import { DATA_LAYERS_URL, loadDataLayers } from "./dataLayers/loadDataLayers";
import { DataLayerNode } from "./dataLayers/types";

const LOG = createLogger("dashboard:MainMapProvider");

export const MAP_ID = "main";

const PROJECTION = "EPSG:3857";

// Cologne
const [INITIAL_X = 0, INITIAL_Y = 0] = fromLonLat([6.9988, 50.9371], PROJECTION);

interface References {
    localeService: LocaleService;
}

export class MainMapProvider implements MapConfigProvider {
    mapId = MAP_ID;

    #localeService: LocaleService;

    constructor({ references }: ServiceOptions<References>) {
        this.#localeService = references.localeService;
    }

    async getMapConfig({ layerFactory }: MapConfigProviderOptions): Promise<MapConfig> {
        const dataLayers = await loadDataLayersSafe();
        const context = {
            layerFactory,
            mapProjection: PROJECTION,
            // Later language changes are applied by `useLocalizedDataLayers()`.
            language: this.#localeService.messageLocale.language
        };
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
            layers: dataLayers.map((config) => createDataLayer(config, context))
        };
    }
}

/** The map should still start (with base layers only) if the data layer configuration is broken. */
async function loadDataLayersSafe(): Promise<DataLayerNode[]> {
    try {
        return await loadDataLayers();
    } catch (error) {
        LOG.error(`Failed to load data layers from ${DATA_LAYERS_URL}.`, error);
        return [];
    }
}
