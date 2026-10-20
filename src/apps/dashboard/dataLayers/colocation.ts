import { StaDatastreamProperties } from "./sta";

/**
 * How sensors at the same site are recognized:
 * - `location`: same (rounded) point location,
 * - `thing`: same SensorThings thing,
 * - `location-or-thing`: either of both.
 *
 * The default is `location` because not every SensorThings server models stations as things.
 */
export type SensorGrouping = "location" | "thing" | "location-or-thing";

const SENSOR_GROUPINGS: SensorGrouping[] = ["location", "thing", "location-or-thing"];

/** Grouping of sensors at the same site, see `VITE_SENSOR_GROUPING`. */
export const SENSOR_GROUPING: SensorGrouping = parseSensorGrouping(import.meta.env.VITE_SENSOR_GROUPING);

export function parseSensorGrouping(value: string | undefined): SensorGrouping {
    return SENSOR_GROUPINGS.find((grouping) => grouping === value) ?? "location";
}

/**
 * Returns the other sensors at the site of the selected sensor, in the order of `all`.
 * Sensors without the key used by the grouping are never grouped.
 */
export function colocatedSensors(
    selected: StaDatastreamProperties,
    all: StaDatastreamProperties[],
    grouping: SensorGrouping
): StaDatastreamProperties[] {
    const sameKey = (key: "locationKey" | "thingId", other: StaDatastreamProperties) =>
        selected[key] !== undefined && selected[key] === other[key];
    const sameSite = (other: StaDatastreamProperties) => {
        switch (grouping) {
            case "location":
                return sameKey("locationKey", other);
            case "thing":
                return sameKey("thingId", other);
            case "location-or-thing":
                return sameKey("locationKey", other) || sameKey("thingId", other);
        }
    };
    return all.filter((other) => other.dataLayerId !== selected.dataLayerId && sameSite(other));
}
