import { createLogger } from "@open-pioneer/core";
import { Layer, SimpleLayer } from "@open-pioneer/map";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Circle, Fill, Stroke, Style } from "ol/style";
import { StaDatastreamLayerConfig } from "../config/types";
import { commonOptions, DataLayerContext } from "../dataLayerBase";
import { createDatastreamFeature, fetchDatastream } from "./sta";

const LOG = createLogger("dashboard:staLayer");

/** Time after which a datastream that has not been loaded counts as failed (instead of loading forever). */
const DATASTREAM_TIMEOUT_MS = 30_000;

const SENSOR_STYLE = new Style({
    image: new Circle({
        radius: 8,
        fill: new Fill({ color: "#dd6b20" }),
        stroke: new Stroke({ color: "#ffffff", width: 2 })
    })
});

export function createStaDatastreamLayer(
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
