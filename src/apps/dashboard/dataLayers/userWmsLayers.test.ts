import { describe, expect, it } from "vitest";
import { WmsDataLayerConfig } from "./types";
import { userWmsLayerInput, withLayerState } from "./userWmsLayers";
import { WmsCapabilities, WmsCapabilitiesLayer } from "./wmsCapabilities";

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
