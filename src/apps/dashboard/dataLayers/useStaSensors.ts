import { AnyLayer, isLayer, MapModel } from "@open-pioneer/map";
import { useReactiveSnapshot } from "@open-pioneer/reactivity";
import { FeatureLike } from "ol/Feature";
import VectorLayer from "ol/layer/Vector";
import { unByKey } from "ol/Observable";
import VectorSource from "ol/source/Vector";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { DATA_LAYER_ATTRIBUTE } from "./createDataLayer";
import { getDatastreamProperties, StaDatastreamProperties } from "./sta";
import { DataLayerNode } from "./types";

/** A SensorThings datastream layer of the map. */
export interface StaSensor {
    /** Id of the data layer (and map layer). */
    id: string;

    /** Current (localized) title of the layer. */
    title: string;
}

/**
 * Returns all SensorThings datastream layers of the map (also hidden ones), in configuration order.
 * Titles update when the language changes.
 */
export function useStaSensors(map: MapModel): StaSensor[] {
    return useReactiveSnapshot(
        () =>
            map.layers
                .getRecursiveLayers({ filter: "operational" })
                .filter(isStaLayer)
                .map((layer) => ({ id: layer.id, title: layer.title })),
        [map]
    );
}

function isStaLayer(layer: AnyLayer): boolean {
    const config = layer.attributes[DATA_LAYER_ATTRIBUTE] as DataLayerNode | undefined;
    return config?.type === "sta-datastream";
}

/**
 * Returns the datastream properties of a SensorThings layer,
 * or `undefined` while the datastream is still loading (or for unknown layers).
 */
export function useDatastreamProperties(
    map: MapModel,
    dataLayerId: string | undefined
): StaDatastreamProperties | undefined {
    const source = useMemo(() => getSensorSource(map, dataLayerId), [map, dataLayerId]);
    const subscribe = useCallback(
        (onChange: () => void) => {
            if (!source) {
                return () => {};
            }
            // The feature is added once the datastream has been loaded.
            const keys = [
                source.on("addfeature", onChange),
                source.on("removefeature", onChange),
                source.on("clear", onChange)
            ];
            return () => unByKey(keys);
        },
        [source]
    );
    const feature = useSyncExternalStore(subscribe, () => source?.getFeatures()[0]);
    return useMemo(() => (feature ? getDatastreamProperties(feature) : undefined), [feature]);
}

function getSensorSource(map: MapModel, dataLayerId: string | undefined): VectorSource<FeatureLike> | undefined {
    const layer = dataLayerId ? map.layers.getLayerById(dataLayerId) : undefined;
    if (!layer || !isLayer(layer) || !(layer.olLayer instanceof VectorLayer)) {
        return undefined;
    }
    return layer.olLayer.getSource() ?? undefined;
}
