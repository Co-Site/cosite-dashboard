import { describe, expect, it } from "vitest";
import { WmsCapabilities, WmsCapabilitiesLayer } from "./wmsCapabilities";
import { userWmsLayerConfig } from "./wmsLayer";

describe("userWmsLayerConfig", () => {
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
        expect(userWmsLayerConfig("https://example.org/wms", capabilities, layer)).toMatchObject({
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
        const notQueryable = userWmsLayerConfig("https://x", capabilities, { ...layer, queryable: false });
        expect(notQueryable.wms.featureInfo).toEqual({ enabled: false });
        const noGeoJson = userWmsLayerConfig(
            "https://x",
            { ...capabilities, featureInfoFormats: ["text/html"] },
            layer
        );
        expect(noGeoJson.wms.featureInfo).toEqual({ enabled: false });
    });

    it("has no description without abstract and service information", () => {
        const bare = { ...capabilities, contactOrganization: undefined, accessConstraints: undefined };
        expect(userWmsLayerConfig("https://x", bare, { ...layer, abstract: "Radar" }).description).toBeUndefined();
    });
});
