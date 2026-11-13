import { AnyLayer, isLayer, MapModel } from "@open-pioneer/map";
import { useReactiveSnapshot } from "@open-pioneer/reactivity";
import { FeatureLike } from "ol/Feature";
import VectorLayer from "ol/layer/Vector";
import { unByKey } from "ol/Observable";
import VectorSource from "ol/source/Vector";
import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { getDataLayerConfig } from "../dataLayerBase";
import { assignStations, colocatedSensors, SENSOR_GROUPING, SENSOR_GROUPING_RADIUS } from "./colocation";
import { ObservedPropertyGroup, observedPropertyGroups } from "./observedProperties";
import { getDatastreamProperties, StaDatastreamProperties } from "./sta";
import { stationColor } from "./stationColors";

/** A SensorThings datastream layer of the map. */
export interface StaSensor {
    /** Id of the data layer (and map layer). */
    id: string;

    /** Current (localized) title of the layer. */
    title: string;
}

function isStaLayer(layer: AnyLayer): boolean {
    return getDataLayerConfig(layer)?.type === "sta-datastream";
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

/**
 * Returns the observed properties that at least two sensors of the map measure (also hidden ones),
 * in configuration order.
 */
export function useObservedProperties(map: MapModel): ObservedPropertyGroup[] {
    return useReactiveSnapshot(
        () =>
            observedPropertyGroups(
                map.layers.getRecursiveLayers({ filter: "operational" }).flatMap((layer) => {
                    const config = getDataLayerConfig(layer);
                    return config?.type === "sta-datastream" ? [config] : [];
                })
            ),
        [map]
    );
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

/** Returns those of the given SensorThings layers that are not available, see {@link useSensorLoadFailed}. */
export function useFailedSensors(map: MapModel, dataLayerIds: string[]): string[] {
    return useReactiveSnapshot(
        () => dataLayerIds.filter((id) => map.layers.getLayerById(id)?.loadState === "error"),
        [map, dataLayerIds]
    );
}

/**
 * Returns the datastream properties of the given SensorThings layers, in the given order.
 * Sensors appear once their datastream has been loaded.
 */
export function useLoadedDatastreams(map: MapModel, dataLayerIds: string[]): StaDatastreamProperties[] {
    // The array is new on every render, the ids rarely change.
    const idList = dataLayerIds.join("\n");
    const sources = useMemo(
        () =>
            idList
                .split("\n")
                .map((id) => getSensorSource(map, id))
                .filter((source) => source !== undefined),
        [map, idList]
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

    return useMemo(
        () => features.map(getDatastreamProperties).filter((datastream) => datastream !== undefined),
        [features]
    );
}

/**
 * Returns the other SensorThings sensors at the site of the given sensor
 * (see {@link SENSOR_GROUPING} and {@link SENSOR_GROUPING_RADIUS}),
 * in configuration order. Sensors appear once their datastream has been loaded.
 */
export function useColocatedSensors(map: MapModel, dataLayerId: string | undefined): StaDatastreamProperties[] {
    const sensors = useStaSensors(map);
    const all = useLoadedDatastreams(
        map,
        sensors.map((sensor) => sensor.id)
    );
    return useMemo(() => {
        const selected = all.find((datastream) => datastream.dataLayerId === dataLayerId);
        return selected ? colocatedSensors(selected, all, SENSOR_GROUPING, SENSOR_GROUPING_RADIUS) : [];
    }, [all, dataLayerId]);
}

/**
 * Returns the colour of every sensor's station by data layer id. Sensors at the same site are one station
 * (see {@link SENSOR_GROUPING}), a sensor on its own is a station too.
 * A sensor gets its colour once its datastream has been loaded (only then its location is known).
 */
export function useStationColors(map: MapModel): Record<string, string> {
    const sensors = useStaSensors(map);
    const all = useLoadedDatastreams(
        map,
        sensors.map((sensor) => sensor.id)
    );
    return useMemo(() => {
        const stations = assignStations(all, SENSOR_GROUPING, SENSOR_GROUPING_RADIUS);
        return Object.fromEntries([...stations].map(([id, station]) => [id, stationColor(station)]));
    }, [all]);
}
