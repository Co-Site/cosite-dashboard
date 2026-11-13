import { StaDatastreamLayerConfig } from "../config/types";

/** An observed property that can be compared: its key and the sensors (data layer ids) that measure it. */
export interface ObservedPropertyGroup {
    key: string;
    sensorIds: string[];
}

/**
 * Groups the sensors by the key of their observed property, in the order in which the keys first appear.
 * Observed properties with a single sensor are omitted, there is nothing to compare.
 */
export function observedPropertyGroups(sensors: StaDatastreamLayerConfig[]): ObservedPropertyGroup[] {
    const groups = new Map<string, string[]>();
    for (const { id, observedProperty } of sensors) {
        if (observedProperty === undefined) {
            continue;
        }
        const sensorIds = groups.get(observedProperty);
        if (sensorIds) {
            sensorIds.push(id);
        } else {
            groups.set(observedProperty, [id]);
        }
    }
    return [...groups].map(([key, sensorIds]) => ({ key, sensorIds })).filter((group) => group.sensorIds.length >= 2);
}
