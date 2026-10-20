import { describe, expect, it } from "vitest";
import { colocatedSensors, parseSensorGrouping } from "./colocation";
import { StaDatastreamProperties } from "./sta";

function sensor(dataLayerId: string, locationKey?: string, thingId?: string): StaDatastreamProperties {
    return {
        dataLayerId,
        datastreamUrl: `https://example.org/Datastreams(${dataLayerId})`,
        observationsUrl: `https://example.org/Datastreams(${dataLayerId})/Observations`,
        name: dataLayerId,
        unit: undefined,
        observedProperty: undefined,
        thing: undefined,
        thingId,
        locationKey
    };
}

const ids = (sensors: StaDatastreamProperties[]) => sensors.map((s) => s.dataLayerId);

describe("colocatedSensors", () => {
    const a = sensor("a", "7,51", "1");
    const sameLocation = sensor("b", "7,51", "2");
    const sameThing = sensor("c", "8,52", "1");
    const elsewhere = sensor("d", "9,53", "3");
    const noKeys = sensor("e");
    const all = [a, sameLocation, sameThing, elsewhere, noKeys];

    it("groups by location", () => {
        expect(ids(colocatedSensors(a, all, "location"))).toEqual(["b"]);
    });

    it("groups by thing", () => {
        expect(ids(colocatedSensors(a, all, "thing"))).toEqual(["c"]);
    });

    it("groups by location or thing", () => {
        expect(ids(colocatedSensors(a, all, "location-or-thing"))).toEqual(["b", "c"]);
    });

    it("never groups sensors without keys", () => {
        expect(colocatedSensors(noKeys, [...all, sensor("f")], "location-or-thing")).toEqual([]);
    });

    it("excludes the selected sensor", () => {
        expect(colocatedSensors(elsewhere, all, "location-or-thing")).toEqual([]);
    });
});

describe("parseSensorGrouping", () => {
    it("accepts the known groupings and falls back to location", () => {
        expect(parseSensorGrouping("thing")).toBe("thing");
        expect(parseSensorGrouping("location-or-thing")).toBe("location-or-thing");
        expect(parseSensorGrouping("station")).toBe("location");
        expect(parseSensorGrouping(undefined)).toBe("location");
    });
});
