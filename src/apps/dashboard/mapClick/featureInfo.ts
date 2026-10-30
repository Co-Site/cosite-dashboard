import { AnyLayer, isLayer, Layer, MapModel, WMSLayer } from "@open-pioneer/map";
import { Coordinate } from "ol/coordinate";
import Feature from "ol/Feature";
import { Geometry } from "ol/geom";
import BaseLayer from "ol/layer/Base";
import { Pixel } from "ol/pixel";
import { getDataLayerConfig } from "../dataLayers/createDataLayer";
import { LocalizedText } from "../dataLayers/localizedText";
import { DataLayerNode, FeatureInfoConfig, FeatureInfoField, WmsDataLayerConfig } from "../dataLayers/types";
import { chooseFeatureInfoFormat, fetchWmsCapabilities } from "../dataLayers/wmsCapabilities";

export interface FeatureInfoValue {
    /** Name of the property in the response. */
    property: string;
    label: LocalizedText;
    value: unknown;
    unit?: string;
}

export interface FeatureInfoFeature {
    id: string;
    values: FeatureInfoValue[];
}

/** Feature info of a single layer (WMS or WFS) at the clicked position. */
export interface FeatureInfoResult {
    layerId: string;

    /** One entry per returned feature. */
    features: FeatureInfoFeature[];

    /** Set if the request failed. */
    error?: unknown;
}

/** A layer is only visible on the map if all of its parents are visible as well. */
function isEffectivelyVisible(layer: AnyLayer): boolean {
    for (let current: AnyLayer | undefined = layer; current; current = current.parent) {
        if (!current.visible) {
            return false;
        }
    }
    return true;
}

function featureInfoConfig(config: DataLayerNode | undefined): FeatureInfoConfig | undefined {
    switch (config?.type) {
        case "wms":
            return config.wms.featureInfo;
        case "wfs":
            return config.wfs.featureInfo;
        default:
            return undefined;
    }
}

/** The visible layers of the given type whose features are shown on click, topmost first. */
function getQueryableLayers(map: MapModel, type: "wms" | "wfs"): AnyLayer[] {
    return map.layers
        .getRecursiveLayers({ filter: "operational", sortByDisplayOrder: true })
        .filter((layer) => isEffectivelyVisible(layer))
        .filter((layer) => {
            const config = getDataLayerConfig(layer);
            return config?.type === type && featureInfoConfig(config)?.enabled !== false;
        })
        .reverse();
}

/**
 * Returns the visible WMS layers of the map that support GetFeatureInfo.
 */
export function getQueryableWmsLayers(map: MapModel): WMSLayer[] {
    return getQueryableLayers(map, "wms").filter((layer): layer is WMSLayer => layer instanceof WMSLayer);
}

/** The visible WFS layers whose features are shown on click, by their OpenLayers layer. */
function getQueryableWfsLayers(map: MapModel): Map<BaseLayer, Layer> {
    return new Map(
        getQueryableLayers(map, "wfs")
            .filter((layer) => isLayer(layer))
            .map((layer) => [layer.olLayer, layer])
    );
}

function toValues(properties: Record<string, unknown>, fields: FeatureInfoField[] | undefined): FeatureInfoValue[] {
    if (!fields) {
        return Object.entries(properties).map(([property, value]) => ({
            property,
            label: property,
            value
        }));
    }
    return fields
        .filter((field) => field.property in properties)
        .map((field) => ({
            property: field.property,
            label: field.label ?? field.property,
            value: properties[field.property],
            unit: field.unit
        }));
}

/** GML properties that describe the feature itself, not its content. */
const TECHNICAL_PROPERTIES = ["boundedBy"];

/** The attributes of a WFS feature, without its geometry. */
function featureProperties(feature: Feature): Record<string, unknown> {
    const properties = { ...feature.getProperties() };
    for (const key of [feature.getGeometryName(), ...TECHNICAL_PROPERTIES]) {
        delete properties[key];
    }
    return properties;
}

/** Whether a feature of a WFS layer that shows its features on click is at the pixel. */
export function hasWfsFeatureAt(map: MapModel, pixel: Pixel, hitTolerance: number): boolean {
    const layers = getQueryableWfsLayers(map);
    return layers.size > 0 && map.olMap.hasFeatureAtPixel(pixel, { layerFilter: (l) => layers.has(l), hitTolerance });
}

/** The WFS features at a pixel: their attributes per layer (topmost first) and their geometries. */
export interface WfsFeatureHits {
    results: FeatureInfoResult[];
    geometries: Geometry[];
}

/**
 * Collects the features of visible WFS layers at the pixel. Unlike WMS no request is needed, the features are
 * already on the map.
 */
export function getWfsFeatureInfo(map: MapModel, pixel: Pixel, hitTolerance: number): WfsFeatureHits {
    const layers = getQueryableWfsLayers(map);
    const results = new Map<string, FeatureInfoResult>();
    const geometries: Geometry[] = [];
    if (layers.size === 0) {
        return { results: [], geometries };
    }
    map.olMap.forEachFeatureAtPixel(
        pixel,
        (feature, olLayer) => {
            const layer = layers.get(olLayer);
            const config = layer && getDataLayerConfig(layer);
            if (!layer || config?.type !== "wfs" || !(feature instanceof Feature)) {
                return;
            }
            let result = results.get(layer.id);
            if (!result) {
                result = { layerId: layer.id, features: [] };
                results.set(layer.id, result);
            }
            result.features.push({
                id: String(feature.getId() ?? result.features.length),
                values: toValues(featureProperties(feature), config.wfs.featureInfo?.fields)
            });
            const geometry = feature.getGeometry();
            if (geometry) {
                geometries.push(geometry);
            }
        },
        { layerFilter: (l) => layers.has(l), hitTolerance }
    );
    return { results: [...results.values()], geometries };
}

/**
 * The configured GetFeatureInfo format, or a GeoJSON format from the capabilities.
 * Falls back to `application/json` if the capabilities cannot be loaded.
 */
async function getFeatureInfoFormat(config: WmsDataLayerConfig): Promise<string | undefined> {
    const format = config.wms.featureInfo?.format;
    if (format) {
        return format;
    }
    try {
        const capabilities = await fetchWmsCapabilities(config.endpoint);
        const queryable = config.wms.layers.some(
            (name) => capabilities.layers.find((layer) => layer.name === name)?.queryable
        );
        return queryable ? chooseFeatureInfoFormat(capabilities.featureInfoFormats) : undefined;
    } catch {
        return "application/json";
    }
}

/**
 * Requests GetFeatureInfo (as GeoJSON) from all given WMS layers at the coordinate.
 * Layers whose service offers no GeoJSON format (or that are not queryable) are left out of the results.
 */
export async function queryWmsFeatureInfo(
    map: MapModel,
    layers: WMSLayer[],
    coordinate: Coordinate,
    signal: AbortSignal
): Promise<FeatureInfoResult[]> {
    const view = map.olMap.getView();
    const resolution = view.getResolution();
    if (resolution == null) {
        return [];
    }
    const projection = view.getProjection();
    const results = await Promise.all(
        layers.map(async (layer): Promise<FeatureInfoResult | undefined> => {
            const config = getDataLayerConfig(layer);
            if (config?.type !== "wms") {
                return undefined;
            }
            const format = await getFeatureInfoFormat(config);
            if (!format) {
                return undefined;
            }
            const result: FeatureInfoResult = {
                layerId: layer.id,
                features: []
            };
            const url = layer.olSource?.getFeatureInfoUrl(coordinate, resolution, projection, {
                INFO_FORMAT: format,
                FEATURE_COUNT: 10
            });
            if (!url) {
                return result;
            }
            try {
                const response = await fetch(url, { signal });
                if (!response.ok) {
                    throw new Error(`GetFeatureInfo failed: HTTP ${response.status}`);
                }
                const json = (await response.json()) as {
                    features?: {
                        id?: string | number;
                        properties?: Record<string, unknown> | null;
                    }[];
                };
                const fields = config.wms.featureInfo?.fields;
                result.features = (json.features ?? []).map((feature, index) => ({
                    id: String(feature.id ?? index),
                    values: toValues(feature.properties ?? {}, fields)
                }));
            } catch (error) {
                if (signal.aborted) {
                    throw error;
                }
                result.error = error;
            }
            return result;
        })
    );
    return results.filter((result) => result !== undefined);
}
