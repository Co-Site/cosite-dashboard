import { getDistance } from "ol/sphere";
import { StaDatastreamProperties } from "./sta";

/**
 * How sensors at the same site are recognized:
 * - `location`: point locations within the grouping radius,
 * - `thing`: same SensorThings thing,
 * - `location-or-thing`: either of both.
 *
 * The default is `location` because not every SensorThings server models stations as things.
 */
export type SensorGrouping = "location" | "thing" | "location-or-thing";

const SENSOR_GROUPINGS: SensorGrouping[] = ["location", "thing", "location-or-thing"];

const DEFAULT_GROUPING_RADIUS = 1;

export function parseSensorGrouping(value: string | undefined): SensorGrouping {
    return SENSOR_GROUPINGS.find((grouping) => grouping === value) ?? "location";
}

export function parseGroupingRadius(value: string | undefined): number {
    const radius = value?.trim() ? Number(value) : NaN;
    return Number.isFinite(radius) && radius >= 0 ? radius : DEFAULT_GROUPING_RADIUS;
}

/** Grouping of sensors at the same site, see `VITE_SENSOR_GROUPING`. */
export const SENSOR_GROUPING: SensorGrouping = parseSensorGrouping(import.meta.env.VITE_SENSOR_GROUPING);

/** Distance in meters up to which point locations count as the same site, see `VITE_SENSOR_GROUPING_RADIUS`. */
export const SENSOR_GROUPING_RADIUS: number = parseGroupingRadius(import.meta.env.VITE_SENSOR_GROUPING_RADIUS);

/**
 * Whether two sensors are at the same site. Point locations count as the same site within `radius` meters
 * (great-circle distance). Sensors without the key used by the grouping are never at the same site.
 */
function sameSite(
    a: StaDatastreamProperties,
    b: StaDatastreamProperties,
    grouping: SensorGrouping,
    radius: number
): boolean {
    const sameThing = a.thingId !== undefined && a.thingId === b.thingId;
    const sameLocation =
        a.position !== undefined && b.position !== undefined && getDistance(a.position, b.position) <= radius;
    switch (grouping) {
        case "location":
            return sameLocation;
        case "thing":
            return sameThing;
        case "location-or-thing":
            return sameLocation || sameThing;
    }
}

/** Returns the other sensors at the site of the selected sensor (see {@link sameSite}), in the order of `all`. */
export function colocatedSensors(
    selected: StaDatastreamProperties,
    all: StaDatastreamProperties[],
    grouping: SensorGrouping,
    radius: number
): StaDatastreamProperties[] {
    return all.filter(
        (other) => other.dataLayerId !== selected.dataLayerId && sameSite(selected, other, grouping, radius)
    );
}

/**
 * Divides the sensors into stations and returns the number of each sensor's station (by data layer id).
 * Stations are numbered in the order of `all`. A sensor belongs to the first station whose first sensor is at the
 * same site (see {@link sameSite}); otherwise it starts a new station, so a sensor on its own is a station too.
 */
export function assignStations(
    all: StaDatastreamProperties[],
    grouping: SensorGrouping,
    radius: number
): Map<string, number> {
    const firstSensors: StaDatastreamProperties[] = [];
    const stations = new Map<string, number>();
    for (const sensor of all) {
        const station = firstSensors.findIndex((first) => sameSite(first, sensor, grouping, radius));
        stations.set(sensor.dataLayerId, station >= 0 ? station : firstSensors.push(sensor) - 1);
    }
    return stations;
}
