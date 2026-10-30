import { describe, expect, it } from "vitest";
import { WfsDataLayerConfig } from "./types";
import { WfsCapabilities } from "./wfsCapabilities";
import { readFeatures, resolveWfsRequest } from "./wfsLayer";

const CAPABILITIES: WfsCapabilities = {
    version: "2.0.0",
    serviceTitle: undefined,
    contactOrganization: undefined,
    fees: undefined,
    accessConstraints: undefined,
    featureTypes: [
        {
            name: "app:a",
            title: "A",
            abstract: undefined,
            namespace: "http://example.org/app",
            crs: ["urn:ogc:def:crs:EPSG::25832", "urn:ogc:def:crs:EPSG::4326"],
            outputFormats: ["GML2", "application/gml+xml; version=3.2", "application/json"]
        }
    ]
};

const config = (wfs: Partial<WfsDataLayerConfig["wfs"]> = {}): WfsDataLayerConfig => ({
    id: "a",
    type: "wfs",
    endpoint: "https://example.org/wfs",
    wfs: { featureType: "app:a", ...wfs }
});

describe("resolveWfsRequest", () => {
    it("takes version and format from the capabilities and prefers GeoJSON and a projected CRS", () => {
        expect(resolveWfsRequest(config(), CAPABILITIES)).toMatchObject({
            version: "2.0.0",
            outputFormat: "application/json",
            encoding: "geojson",
            srsName: "urn:ogc:def:crs:EPSG::25832",
            dataProjection: "EPSG:25832"
        });
    });

    it("lets the configuration choose version and output format", () => {
        expect(resolveWfsRequest(config({ version: "1.1.0", outputFormat: "GML2" }), CAPABILITIES)).toMatchObject({
            version: "1.1.0",
            outputFormat: "GML2",
            encoding: "gml2"
        });
    });

    it("rejects unknown feature types and unreadable formats", () => {
        expect(() => resolveWfsRequest(config({ featureType: "app:b" }), CAPABILITIES)).toThrow(/app:b/);
        expect(() => resolveWfsRequest(config({ outputFormat: "SHAPE-ZIP" }), CAPABILITIES)).toThrow(/SHAPE-ZIP/);
        const csvOnly = {
            ...CAPABILITIES,
            featureTypes: [{ ...CAPABILITIES.featureTypes[0]!, outputFormats: ["csv"] }]
        };
        expect(() => resolveWfsRequest(config(), csvOnly)).toThrow(/none offered/);
    });
});

describe("readFeatures", () => {
    const settings = resolveWfsRequest(config(), CAPABILITIES);

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
            { ...settings, dataProjection: "EPSG:3857" },
            "EPSG:3857"
        );
        expect(features.map((feature) => feature.getId())).toEqual(["a.1"]);
        expect(features[0]!.get("n")).toBe(1);
        expect(readFeatures(`{"type":"FeatureCollection"}`, settings, "EPSG:3857")).toEqual([]);
    });
});
