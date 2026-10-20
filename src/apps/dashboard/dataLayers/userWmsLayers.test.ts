import { describe, expect, it } from "vitest";
import { WmsDataLayerConfig } from "./types";
import { withLayerState } from "./userWmsLayers";

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
