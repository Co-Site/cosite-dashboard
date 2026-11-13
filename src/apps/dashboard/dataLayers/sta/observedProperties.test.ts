import { describe, expect, it } from "vitest";
import { StaDatastreamLayerConfig } from "../config/types";
import { observedPropertyGroups } from "./observedProperties";

function sensor(id: string, observedProperty?: string): StaDatastreamLayerConfig {
    return { id, type: "sta-datastream", name: id, endpoint: `https://example.org/${id}`, observedProperty };
}

describe("observedPropertyGroups", () => {
    it("groups sensors by observed property, in the order of the configuration", () => {
        const groups = observedPropertyGroups([
            sensor("a", "soil_temperature"),
            sensor("b", "wind_speed"),
            sensor("c", "wind_speed"),
            sensor("d", "soil_temperature")
        ]);
        expect(groups).toEqual([
            { key: "soil_temperature", sensorIds: ["a", "d"] },
            { key: "wind_speed", sensorIds: ["b", "c"] }
        ]);
    });

    it("omits observed properties with a single sensor and sensors without observed property", () => {
        expect(observedPropertyGroups([sensor("a", "soil_moisture"), sensor("b"), sensor("c")])).toEqual([]);
    });
});
