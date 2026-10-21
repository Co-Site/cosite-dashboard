import { AnyLayer, isLayer, MapModel } from "@open-pioneer/map";
import { useReactiveSnapshot } from "@open-pioneer/reactivity";
import { FeatureLike } from "ol/Feature";
import VectorLayer from "ol/layer/Vector";
import { unByKey } from "ol/Observable";
import VectorSource from "ol/source/Vector";
import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { colocatedSensors, SENSOR_GROUPING, SENSOR_GROUPING_RADIUS } from "./colocation";
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
 * The feature of a SensorThings layer. A layer holds exactly one datastream, further features would be ignored
 * (see `docs/DashboardDecisions.md`, section 8, "Annahmen der STA-Hooks").
 */
function datastreamFeature(source: VectorSource<FeatureLike> | undefined): FeatureLike | undefined {
    return source?.getFeatures()[0];
}

/**
 * Returns the datastream properties of a SensorThings layer,
 * or `undefined` while the datastream is still loading, if it failed (see {@link useSensorLoadFailed})
 * or for unknown layers.
 */
export function useDatastreamProperties(
    map: MapModel,
    dataLayerId: string | undefined
): StaDatastreamProperties | undefined {
    // Looked up once per id, not reactively: the layer must already be in the map
    // (see `docs/DashboardDecisions.md`, section 8, "Annahmen der STA-Hooks").
    const source = useMemo(() => getSensorSource(map, dataLayerId), [map, dataLayerId]);
    const subscribe = useCallback(
        (onChange: () => void) => subscribeSources(source ? [source] : [], onChange),
        [source]
    );
    const feature = useSyncExternalStore(subscribe, () => datastreamFeature(source));
    return useMemo(() => (feature ? getDatastreamProperties(feature) : undefined), [feature]);
}

/**
 * Whether a SensorThings layer is not available: its datastream could not be loaded (error or timeout),
 * has no location, or the endpoint fails the layer's health check.
 */
export function useSensorLoadFailed(map: MapModel, dataLayerId: string | undefined): boolean {
    return useReactiveSnapshot(
        () => (dataLayerId ? map.layers.getLayerById(dataLayerId)?.loadState === "error" : false),
        [map, dataLayerId]
    );
}

/**
 * Returns the other SensorThings sensors at the site of the given sensor
 * (see {@link SENSOR_GROUPING} and {@link SENSOR_GROUPING_RADIUS}),
 * in configuration order. Sensors appear once their datastream has been loaded.
 */
export function useColocatedSensors(map: MapModel, dataLayerId: string | undefined): StaDatastreamProperties[] {
    const sensors = useStaSensors(map);
    // Titles change with the language, the sources only with the layers.
    const sensorIds = sensors.map((sensor) => sensor.id).join("\n");
    const sources = useMemo(
        () =>
            sensorIds
                .split("\n")
                .map((id) => getSensorSource(map, id))
                .filter((source) => source !== undefined),
        [map, sensorIds]
    );
    const subscribe = useCallback((onChange: () => void) => subscribeSources(sources, onChange), [sources]);

    // The snapshot must stay the same object as long as no feature changed.
    const snapshot = useRef<FeatureLike[]>([]);
    const features = useSyncExternalStore(subscribe, () => {
        const current = sources.map(datastreamFeature).filter((feature) => feature !== undefined);
        const previous = snapshot.current;
        if (current.length !== previous.length || current.some((feature, index) => feature !== previous[index])) {
            snapshot.current = current;
        }
        return snapshot.current;
    });

    return useMemo(() => {
        const all = features.map(getDatastreamProperties).filter((datastream) => datastream !== undefined);
        const selected = all.find((datastream) => datastream.dataLayerId === dataLayerId);
        return selected ? colocatedSensors(selected, all, SENSOR_GROUPING, SENSOR_GROUPING_RADIUS) : [];
    }, [features, dataLayerId]);
}

/** Calls `onChange` when features of the sources change (a feature is added once its datastream has been loaded). */
function subscribeSources(sources: VectorSource<FeatureLike>[], onChange: () => void): () => void {
    const keys = sources.flatMap((source) => [
        source.on("addfeature", onChange),
        source.on("removefeature", onChange),
        source.on("clear", onChange)
    ]);
    return () => unByKey(keys);
}

function getSensorSource(map: MapModel, dataLayerId: string | undefined): VectorSource<FeatureLike> | undefined {
    const layer = dataLayerId ? map.layers.getLayerById(dataLayerId) : undefined;
    if (!layer || !isLayer(layer) || !(layer.olLayer instanceof VectorLayer)) {
        return undefined;
    }
    return layer.olLayer.getSource() ?? undefined;
}
