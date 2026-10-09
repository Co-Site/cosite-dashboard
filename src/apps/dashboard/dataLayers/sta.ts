// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import { Geometry } from "ol/geom";

/** Subset of an OGC SensorThings API v1.1 datastream (with expanded Thing/Locations and ObservedProperty). */
export interface StaDatastream {
    "@iot.id": number | string;
    "name": string;
    "description"?: string;
    "unitOfMeasurement"?: { name?: string; symbol?: string; definition?: string };
    "observedArea"?: GeoJSONGeometry;
    "phenomenonTime"?: string;
    "Observations@iot.navigationLink"?: string;
    "ObservedProperty"?: { name?: string; description?: string };
    "Thing"?: {
        name?: string;
        Locations?: { location?: GeoJSONGeometry }[];
    };
}

interface GeoJSONGeometry {
    type: string;
    coordinates: unknown;
}

/** Feature properties of a datastream feature (used e.g. for charts on map click). */
export interface StaDatastreamProperties {
    dataLayerId: string;
    datastreamUrl: string;
    observationsUrl: string;
    name: string;
    unit: string | undefined;
    observedProperty: string | undefined;
    thing: string | undefined;
}

/**
 * Fetches a datastream including the location of its thing.
 */
export async function fetchDatastream(
    endpoint: string,
    signal?: AbortSignal
): Promise<StaDatastream> {
    const url = new URL(endpoint);
    url.searchParams.set("$expand", "Thing/Locations,ObservedProperty");
    const response = await fetch(url, { signal });
    if (!response.ok) {
        throw new Error(`Failed to load datastream ${endpoint}: HTTP ${response.status}`);
    }
    return (await response.json()) as StaDatastream;
}

/**
 * Creates a map feature for the datastream, located at its thing's location
 * (or at the datastream's observed area if the thing has no location).
 */
export function createDatastreamFeature(
    dataLayerId: string,
    endpoint: string,
    datastream: StaDatastream,
    mapProjection: string
): Feature<Geometry> | undefined {
    const geometry = datastream.Thing?.Locations?.[0]?.location ?? datastream.observedArea;
    if (!geometry) {
        return undefined;
    }

    const olGeometry = new GeoJSON().readGeometry(geometry, {
        dataProjection: "EPSG:4326",
        featureProjection: mapProjection
    });
    const properties: StaDatastreamProperties = {
        dataLayerId,
        datastreamUrl: endpoint,
        observationsUrl:
            datastream["Observations@iot.navigationLink"] ?? `${endpoint}/Observations`,
        name: datastream.name,
        unit: datastream.unitOfMeasurement?.symbol,
        observedProperty: datastream.ObservedProperty?.name,
        thing: datastream.Thing?.name
    };
    const feature = new Feature<Geometry>({ geometry: olGeometry, ...properties });
    feature.setId(String(datastream["@iot.id"]));
    return feature;
}
