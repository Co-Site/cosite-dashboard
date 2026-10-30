import { describe, expect, it } from "vitest";
import { WmsDataLayerConfig } from "./config/types";
import { WfsCapabilities } from "./ows/wfsCapabilities";
import { WmsCapabilities, WmsCapabilitiesLayer } from "./ows/wmsCapabilities";
import { userWfsLayerInput, userWmsLayerInput, withLayerState } from "./userLayers";

describe("withLayerState", () => {
    const config: WmsDataLayerConfig = {
        id: "user-wms-1",
        type: "wms",
        name: "Radar",
        endpoint: "https://example.org/wms",
        opacity: 1,
        wms: { layers: ["radar"] },
        temporary: true
    };

    it("takes over visibility and opacity of the layer", () => {
        const layer = { visible: false, olLayer: { getOpacity: () => 0.4 } };
        expect(withLayerState(config, layer)).toEqual({ ...config, visible: false, opacity: 0.4 });
    });

    it("keeps the config without layer", () => {
        expect(withLayerState(config, undefined)).toBe(config);
    });
});

describe("userWmsLayerInput", () => {
    const layer: WmsCapabilitiesLayer = {
        name: "radar",
        title: "Radar",
        abstract: "Precipitation of the last hour",
        queryable: true,
        attribution: "DWD",
        legendUrl: undefined,
        supportsMapProjection: true,
        path: [],
        isGroup: false
    };
    const capabilities: WmsCapabilities = {
        serviceTitle: "Service",
        contactOrganization: "DWD",
        fees: undefined,
        accessConstraints: "CC BY 4.0",
        featureInfoFormats: ["text/html", "application/json"],
        layers: [layer]
    };

    it("builds the layer from the capabilities, with a description in both languages", () => {
        expect(userWmsLayerInput("https://example.org/wms", capabilities, layer)).toEqual({
            name: "Radar",
            description: {
                de: "Precipitation of the last hour\n\nAnbieter: DWD\n\nNutzungsbedingungen: CC BY 4.0",
                en: "Precipitation of the last hour\n\nProvider: DWD\n\nTerms of use: CC BY 4.0"
            },
            endpoint: "https://example.org/wms",
            attribution: "DWD",
            wms: { layers: ["radar"], featureInfo: { format: "application/json" } }
        });
    });

    it("disables the feature info for layers that are not queryable or without GeoJSON", () => {
        const notQueryable = userWmsLayerInput("https://x", capabilities, { ...layer, queryable: false });
        expect(notQueryable.wms.featureInfo).toEqual({ enabled: false });
        const noGeoJson = userWmsLayerInput("https://x", { ...capabilities, featureInfoFormats: ["text/html"] }, layer);
        expect(noGeoJson.wms.featureInfo).toEqual({ enabled: false });
    });

    it("has no description without abstract and service information", () => {
        const bare = { ...capabilities, contactOrganization: undefined, accessConstraints: undefined };
        expect(userWmsLayerInput("https://x", bare, { ...layer, abstract: "Radar" }).description).toBeUndefined();
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
