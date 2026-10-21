import Feature, { FeatureLike } from "ol/Feature";
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
        "@iot.id"?: number | string;
        "name"?: string;
        Locations?: { location?: GeoJSONGeometry }[];
    };
}

export interface GeoJSONGeometry {
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

    /** Id of the datastream's thing (groups sensors of the same station). */
    thingId: string | undefined;

    /**
     * Longitude/latitude (EPSG:4326) of a point location (groups sensors at the same site), see {@link pointPosition}.
     * Taken from the GeoJSON, not from the feature geometry, which is in the map projection.
     */
    position: [number, number] | undefined;
}

/**
 * Fetches a datastream including the location of its thing.
 */
export async function fetchDatastream(endpoint: string, signal?: AbortSignal): Promise<StaDatastream> {
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
        observationsUrl: datastream["Observations@iot.navigationLink"] ?? `${endpoint}/Observations`,
        name: datastream.name,
        unit: displayUnit(datastream.unitOfMeasurement?.symbol),
        observedProperty: datastream.ObservedProperty?.name,
        thing: datastream.Thing?.name,
        thingId: datastream.Thing?.["@iot.id"] === undefined ? undefined : String(datastream.Thing["@iot.id"]),
        position: pointPosition(geometry)
    };
    const feature = new Feature<Geometry>({ geometry: olGeometry, ...properties });
    feature.setId(String(datastream["@iot.id"]));
    return feature;
}

/**
 * Returns the longitude/latitude (EPSG:4326, as in GeoJSON) of a point location.
 * Other geometries have no position.
 */
export function pointPosition(geometry: GeoJSONGeometry | undefined): [number, number] | undefined {
    if (geometry?.type !== "Point" || !Array.isArray(geometry.coordinates)) {
        return undefined;
    }
    const [x, y] = geometry.coordinates;
    if (typeof x !== "number" || typeof y !== "number") {
        return undefined;
    }
    return [x, y];
}

/** Unit symbols (e.g. UCUM codes) that have a more common display form. */
const UNIT_SYMBOLS: Record<string, string> = {
    degC: "°C",
    Cel: "°C",
    degF: "°F",
    "[degF]": "°F"
};

export function displayUnit(symbol: string | undefined): string | undefined {
    return symbol ? (UNIT_SYMBOLS[symbol] ?? symbol) : undefined;
}

/**
 * Returns the datastream properties of a feature created by {@link createDatastreamFeature}.
 */
export function getDatastreamProperties(feature: FeatureLike): StaDatastreamProperties | undefined {
    const properties = feature.getProperties();
    if (typeof properties.observationsUrl !== "string") {
        return undefined;
    }
    return {
        dataLayerId: properties.dataLayerId,
        datastreamUrl: properties.datastreamUrl,
        observationsUrl: properties.observationsUrl,
        name: properties.name,
        unit: properties.unit,
        observedProperty: properties.observedProperty,
        thing: properties.thing,
        thingId: properties.thingId,
        position: properties.position
    };
}

/** A single observation, `time` in milliseconds since epoch. */
export interface Observation {
    time: number;
    value: number;
}

/** Upper limit for the number of observations loaded for a chart. */
export const MAX_OBSERVATIONS = 20_000;

/**
 * Loads the numeric observations of a datastream within the given time range (oldest first).
 * Follows the server's paging (`@iot.nextLink`) up to {@link MAX_OBSERVATIONS}.
 */
export async function fetchObservations(
    observationsUrl: string,
    range: { from: Date; to: Date },
    signal?: AbortSignal
): Promise<{ observations: Observation[]; truncated: boolean }> {
    const url = new URL(observationsUrl);
    url.searchParams.set(
        "$filter",
        `phenomenonTime ge ${range.from.toISOString()} and phenomenonTime le ${range.to.toISOString()}`
    );
    url.searchParams.set("$orderby", "phenomenonTime asc");
    url.searchParams.set("$select", "phenomenonTime,result");
    url.searchParams.set("$top", "1000");

    const observations: Observation[] = [];
    let next: string | undefined = url.href;
    // Pages must be fetched one after another (each response links to the next page).
    /* oxlint-disable no-await-in-loop */
    while (next && observations.length < MAX_OBSERVATIONS) {
        const response = await fetch(next, { signal });
        if (!response.ok) {
            throw new Error(`Failed to load observations: HTTP ${response.status}`);
        }
        const page = (await response.json()) as ObservationPage;
        for (const raw of page.value) {
            const observation = parseObservation(raw);
            if (observation) {
                observations.push(observation);
            }
        }
        next = page["@iot.nextLink"];
    }
    /* oxlint-enable no-await-in-loop */
    return { observations: observations.slice(0, MAX_OBSERVATIONS), truncated: !!next };
}

/**
 * Loads the newest numeric observation of a datastream (independent of any time range),
 * or `undefined` if the newest observation is not numeric or there is none.
 */
export async function fetchLatestObservation(
    observationsUrl: string,
    signal?: AbortSignal
): Promise<Observation | undefined> {
    const url = new URL(observationsUrl);
    url.searchParams.set("$orderby", "phenomenonTime desc");
    url.searchParams.set("$select", "phenomenonTime,result");
    url.searchParams.set("$top", "1");
    const response = await fetch(url, { signal });
    if (!response.ok) {
        throw new Error(`Failed to load the latest observation: HTTP ${response.status}`);
    }
    const page = (await response.json()) as ObservationPage;
    const raw = page.value[0];
    return raw ? parseObservation(raw) : undefined;
}

/** A page of observations as returned by the server (with `$select=phenomenonTime,result`). */
interface ObservationPage {
    "value": RawObservation[];
    "@iot.nextLink"?: string;
}

export interface RawObservation {
    phenomenonTime: string;
    result: unknown;
}

/**
 * Converts an observation of the server, or returns `undefined` if its result is not numeric.
 * The phenomenon time may be an interval ("start/end"), its start is used.
 */
export function parseObservation({ phenomenonTime, result }: RawObservation): Observation | undefined {
    const time = Date.parse(phenomenonTime.split("/")[0] ?? "");
    return typeof result === "number" && !Number.isNaN(time) ? { time, value: result } : undefined;
}
