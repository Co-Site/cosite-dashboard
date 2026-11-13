import { StaDatastreamLayerConfig } from "../config/types";

/**
 * Groups the sensors (data layer ids) by the key of their observed property, in the order in which the keys
 * first appear. Observed properties with a single sensor are omitted, there is nothing to compare.
 */
export function observedPropertyGroups(sensors: StaDatastreamLayerConfig[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    for (const { id, observedProperty } of sensors) {
        if (observedProperty !== undefined) {
            (groups[observedProperty] ??= []).push(id);
        }
    }
    return Object.fromEntries(Object.entries(groups).filter(([, sensorIds]) => sensorIds.length >= 2));
}
