import { describe, expect, it } from "vitest";
import { WfsRequestSettings } from "./wfsCapabilities";
import { readFeatures } from "./wfsLayer";

const SETTINGS: WfsRequestSettings = {
    featureType: {
        name: "app:a",
        title: "A",
        abstract: undefined,
        namespace: undefined,
        crs: ["EPSG:3857"],
        outputFormats: ["application/json"]
    },
    version: "2.0.0",
    outputFormat: "application/json",
    encoding: "geojson",
    srsName: "EPSG:3857",
    dataProjection: "EPSG:3857"
};

describe("readFeatures", () => {
    it("reads GeoJSON, also without a feature list", () => {
        const features = readFeatures(
            JSON.stringify({
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        id: "a.1",
                        geometry: { type: "Point", coordinates: [1, 2] },
                        properties: { n: 1 }
                    }
                ]
            }),
            SETTINGS,
            "EPSG:3857"
        );
        expect(features.map((feature) => feature.getId())).toEqual(["a.1"]);
        expect(features[0]!.get("n")).toBe(1);
        expect(readFeatures(`{"type":"FeatureCollection"}`, SETTINGS, "EPSG:3857")).toEqual([]);
    });
});
