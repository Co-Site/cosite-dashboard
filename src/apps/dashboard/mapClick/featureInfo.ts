import { AnyLayer, MapModel, WMSLayer } from "@open-pioneer/map";
import { Coordinate } from "ol/coordinate";
import { DATA_LAYER_ATTRIBUTE } from "../dataLayers/createDataLayer";
import { LocalizedText } from "../dataLayers/localizedText";
import { DataLayerNode, FeatureInfoField, WmsDataLayerConfig } from "../dataLayers/types";
import { chooseFeatureInfoFormat, fetchWmsCapabilities } from "../dataLayers/wmsCapabilities";

/** Feature info of a single WMS layer at the clicked position. */
export interface FeatureInfoResult {
    layerId: string;

    /** One entry per returned feature. */
    features: FeatureInfoFeature[];

    /** Set if the request failed. */
    error?: unknown;
}

export interface FeatureInfoFeature {
    id: string;
    values: FeatureInfoValue[];
}

export interface FeatureInfoValue {
    /** Name of the property in the response. */
    property: string;
    label: LocalizedText;
    value: unknown;
    unit?: string;
}

/**
 * Returns the visible WMS layers of the map that support GetFeatureInfo.
 */
export function getQueryableWmsLayers(map: MapModel): WMSLayer[] {
    return map.layers
        .getRecursiveLayers({ filter: "operational", sortByDisplayOrder: true })
        .filter((layer): layer is WMSLayer => layer instanceof WMSLayer)
        .filter((layer) => isEffectivelyVisible(layer))
        .filter((layer) => {
            const config = getDataLayerConfig(layer);
            return config?.type === "wms" && config.wms.featureInfo?.enabled !== false;
        })
        .reverse(); // topmost layer first
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
            const result: FeatureInfoResult = {
                layerId: layer.id,
                features: []
            };
            const config = getDataLayerConfig(layer);
            const format = config?.type === "wms" ? await getFeatureInfoFormat(config) : undefined;
            if (!format) {
                return undefined;
            }
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
                const fields = config?.type === "wms" ? config.wms.featureInfo?.fields : undefined;
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

function getDataLayerConfig(layer: AnyLayer): DataLayerNode | undefined {
    return layer.attributes[DATA_LAYER_ATTRIBUTE] as DataLayerNode | undefined;
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
