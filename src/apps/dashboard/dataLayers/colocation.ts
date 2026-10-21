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
 * Returns the other sensors at the site of the selected sensor, in the order of `all`.
 * Point locations count as the same site within `radius` meters (great-circle distance).
 * Sensors without the key used by the grouping are never grouped.
 */
export function colocatedSensors(
    selected: StaDatastreamProperties,
    all: StaDatastreamProperties[],
    grouping: SensorGrouping,
    radius: number
): StaDatastreamProperties[] {
    const sameThing = (other: StaDatastreamProperties) =>
        selected.thingId !== undefined && selected.thingId === other.thingId;
    const sameLocation = (other: StaDatastreamProperties) =>
        selected.position !== undefined &&
        other.position !== undefined &&
        getDistance(selected.position, other.position) <= radius;
    const sameSite = (other: StaDatastreamProperties) => {
        switch (grouping) {
            case "location":
                return sameLocation(other);
            case "thing":
                return sameThing(other);
            case "location-or-thing":
                return sameLocation(other) || sameThing(other);
        }
    };
    return all.filter((other) => other.dataLayerId !== selected.dataLayerId && sameSite(other));
}
