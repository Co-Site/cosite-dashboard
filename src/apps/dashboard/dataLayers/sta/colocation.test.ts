import { describe, expect, it } from "vitest";
import { colocatedSensors, parseGroupingRadius, parseSensorGrouping } from "./colocation";
import { StaDatastreamProperties } from "./sta";

function sensor(dataLayerId: string, position?: [number, number], thingId?: string): StaDatastreamProperties {
    return {
        dataLayerId,
        datastreamUrl: `https://example.org/Datastreams(${dataLayerId})`,
        observationsUrl: `https://example.org/Datastreams(${dataLayerId})/Observations`,
        name: dataLayerId,
        unit: undefined,
        observedProperty: undefined,
        thing: undefined,
        thingId,
        position
    };
}

const ids = (sensors: StaDatastreamProperties[]) => sensors.map((s) => s.dataLayerId);

/** Degrees of latitude per meter (great circle on the mean earth radius). */
const DEGREES_PER_METER = 180 / (Math.PI * 6371008.8);

describe("colocatedSensors", () => {
    const a = sensor("a", [7, 51], "1");
    const sameLocation = sensor("b", [7, 51], "2");
    const sameThing = sensor("c", [8, 52], "1");
    const elsewhere = sensor("d", [9, 53], "3");
    const noKeys = sensor("e");
    const all = [a, sameLocation, sameThing, elsewhere, noKeys];

    it("groups by location", () => {
        expect(ids(colocatedSensors(a, all, "location", 1))).toEqual(["b"]);
    });

    it("groups by thing", () => {
        expect(ids(colocatedSensors(a, all, "thing", 1))).toEqual(["c"]);
    });

    it("groups by location or thing", () => {
        expect(ids(colocatedSensors(a, all, "location-or-thing", 1))).toEqual(["b", "c"]);
    });

    it("groups locations within the radius", () => {
        const near = sensor("near", [7, 51 + 0.5 * DEGREES_PER_METER]);
        const far = sensor("far", [7, 51 + 2 * DEGREES_PER_METER]);
        expect(ids(colocatedSensors(a, [a, near, far], "location", 1))).toEqual(["near"]);
        expect(ids(colocatedSensors(a, [a, near, far], "location", 3))).toEqual(["near", "far"]);
    });

    it("groups close locations that round to different coordinates", () => {
        const left = sensor("left", [7.6284004, 51.9621]);
        const right = sensor("right", [7.6284006, 51.9621]);
        expect(ids(colocatedSensors(left, [left, right], "location", 1))).toEqual(["right"]);
    });

    it("groups only equal locations with radius 0", () => {
        const near = sensor("near", [7, 51 + 0.5 * DEGREES_PER_METER]);
        expect(ids(colocatedSensors(a, [a, sameLocation, near], "location", 0))).toEqual(["b"]);
    });

    it("never groups sensors without keys", () => {
        expect(colocatedSensors(noKeys, [...all, sensor("f")], "location-or-thing", 1)).toEqual([]);
    });

    it("excludes the selected sensor", () => {
        expect(colocatedSensors(elsewhere, all, "location-or-thing", 1)).toEqual([]);
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

describe("parseGroupingRadius", () => {
    it("accepts non-negative numbers and falls back to 1 m", () => {
        expect(parseGroupingRadius("2.5")).toBe(2.5);
        expect(parseGroupingRadius("0")).toBe(0);
        expect(parseGroupingRadius(undefined)).toBe(1);
        expect(parseGroupingRadius("")).toBe(1);
        expect(parseGroupingRadius("abc")).toBe(1);
        expect(parseGroupingRadius("-1")).toBe(1);
    });
});
