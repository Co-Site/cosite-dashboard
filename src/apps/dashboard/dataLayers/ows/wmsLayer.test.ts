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
        contactOrganization: "DWD",
        fees: undefined,
        accessConstraints: "CC BY 4.0",
        featureInfoFormats: ["text/html", "application/json"],
        layers: [layer]
    };

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
