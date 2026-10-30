import { describe, expect, it } from "vitest";
import { WfsDataLayerConfig } from "../config/types";
import { WfsCapabilities } from "./wfsCapabilities";
import { readFeatures, resolveWfsRequest, userWfsLayerInput } from "./wfsLayer";

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

const wfs = (options: Partial<WfsDataLayerConfig["wfs"]> = {}): WfsDataLayerConfig["wfs"] => ({
    featureType: "app:a",
    ...options
});

describe("resolveWfsRequest", () => {
    it("takes version and format from the capabilities and prefers GeoJSON and a projected CRS", () => {
        expect(resolveWfsRequest(wfs(), CAPABILITIES)).toMatchObject({
            version: "2.0.0",
            outputFormat: "application/json",
            encoding: "geojson",
            srsName: "urn:ogc:def:crs:EPSG::25832",
            dataProjection: "EPSG:25832"
        });
    });

    it("lets the configuration choose version and output format", () => {
        expect(resolveWfsRequest(wfs({ version: "1.1.0", outputFormat: "GML2" }), CAPABILITIES)).toMatchObject({
            version: "1.1.0",
            outputFormat: "GML2",
            encoding: "gml2"
        });
    });

    it("rejects unknown feature types and unreadable formats", () => {
        expect(() => resolveWfsRequest(wfs({ featureType: "app:b" }), CAPABILITIES)).toThrow(/app:b/);
        expect(() => resolveWfsRequest(wfs({ outputFormat: "SHAPE-ZIP" }), CAPABILITIES)).toThrow(/SHAPE-ZIP/);
        const csvOnly = {
            ...CAPABILITIES,
            featureTypes: [{ ...CAPABILITIES.featureTypes[0]!, outputFormats: ["csv"] }]
        };
        expect(() => resolveWfsRequest(wfs(), csvOnly)).toThrow(/none offered/);
    });
});

describe("readFeatures", () => {
    const settings = resolveWfsRequest(wfs(), CAPABILITIES);

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

describe("userWfsLayerInput", () => {
    const capabilities: WfsCapabilities = {
        version: "2.0.0",
        serviceTitle: "Verwaltungsgrenzen",
        contactOrganization: "LGV Hamburg",
        fees: undefined,
        accessConstraints: undefined,
        featureTypes: []
    };
    const featureType = {
        name: "app:bezirke",
        title: "Bezirke",
        abstract: undefined,
        namespace: undefined,
        crs: ["EPSG:25832"],
        outputFormats: ["application/geo+json"]
    };

    it("builds the layer from the feature type with the given colour", () => {
        expect(userWfsLayerInput("https://example.org/wfs", capabilities, featureType, "#2b6cb0")).toEqual({
            name: "Bezirke",
            description: { de: "Anbieter: LGV Hamburg", en: "Provider: LGV Hamburg" },
            endpoint: "https://example.org/wfs",
            wfs: { featureType: "app:bezirke", color: "#2b6cb0" }
        });
    });
});
