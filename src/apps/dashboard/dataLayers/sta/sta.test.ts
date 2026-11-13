import Feature from "ol/Feature";
import { describe, expect, it } from "vitest";
import { StaDatastreamLayerConfig } from "../config/types";
import {
    createDatastreamFeature,
    getDatastreamProperties,
    parseObservation,
    pointPosition,
    StaDatastream
} from "./sta";

describe("pointPosition", () => {
    it("returns the coordinates of a point unchanged", () => {
        expect(pointPosition({ type: "Point", coordinates: [6.99812345, 50.938012] })).toEqual([6.99812345, 50.938012]);
    });

    it("has no position for other or missing geometries", () => {
        expect(
            pointPosition({
                type: "Polygon",
                coordinates: [
                    [
                        [7, 51],
                        [8, 51],
                        [7, 52],
                        [7, 51]
                    ]
                ]
            })
        ).toBeUndefined();
        expect(pointPosition({ type: "Point", coordinates: ["7", "51"] })).toBeUndefined();
        expect(pointPosition(undefined)).toBeUndefined();
    });
});

describe("parseObservation", () => {
    it("converts numeric observations", () => {
        expect(parseObservation({ phenomenonTime: "2026-10-20T08:00:00Z", result: 12.5 })).toEqual({
            time: Date.parse("2026-10-20T08:00:00Z"),
            value: 12.5
        });
    });

    it("uses the start of a time interval", () => {
        expect(parseObservation({ phenomenonTime: "2026-10-20T08:00:00Z/2026-10-20T09:00:00Z", result: 1 })?.time).toBe(
            Date.parse("2026-10-20T08:00:00Z")
        );
    });

    it("skips non-numeric results and invalid times", () => {
        expect(parseObservation({ phenomenonTime: "2026-10-20T08:00:00Z", result: "12.5" })).toBeUndefined();
        expect(parseObservation({ phenomenonTime: "yesterday", result: 1 })).toBeUndefined();
    });
});

const SENSOR: StaDatastreamLayerConfig = {
    id: "sta-ds-14",
    type: "sta-datastream",
    name: "Soil temperature",
    endpoint: "https://example.org/Datastreams(14)"
};

const DATASTREAM: StaDatastream = {
    "@iot.id": 14,
    "name": "Soil temperature",
    "unitOfMeasurement": { symbol: "degC" },
    "Thing": {
        "@iot.id": 2,
        "name": "Node",
        "Locations": [{ location: { type: "Point", coordinates: [7, 51] } }]
    }
};

describe("getDatastreamProperties", () => {
    it("returns the properties of a datastream feature", () => {
        const feature = createDatastreamFeature(SENSOR, DATASTREAM, "EPSG:4326");
        expect(feature && getDatastreamProperties(feature)).toEqual({
            dataLayerId: "sta-ds-14",
            datastreamUrl: "https://example.org/Datastreams(14)",
            observationsUrl: "https://example.org/Datastreams(14)/Observations",
            name: "Soil temperature",
            unit: "°C",
            observedProperty: undefined,
            thing: "Node",
            thingId: "2",
            position: [7, 51]
        });
    });

    it("prefers the configured unit over the unit of the datastream", () => {
        const feature = createDatastreamFeature({ ...SENSOR, unit: "K" }, DATASTREAM, "EPSG:4326");
        expect(feature && getDatastreamProperties(feature)?.unit).toBe("K");
    });

    it("returns nothing for other features", () => {
        expect(getDatastreamProperties(new Feature({ name: "other" }))).toBeUndefined();
    });
});
