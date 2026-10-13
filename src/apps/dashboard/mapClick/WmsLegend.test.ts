import { describe, expect, it } from "vitest";
import { getLegendGraphicUrl } from "./WmsLegend";

describe("getLegendGraphicUrl", () => {
    it("builds a GetLegendGraphic request for a layer", () => {
        const url = new URL(getLegendGraphicUrl("https://example.com/wms?MAP=x", "temp"));
        expect(url.origin + url.pathname).toBe("https://example.com/wms");
        expect(Object.fromEntries(url.searchParams)).toEqual({
            MAP: "x",
            SERVICE: "WMS",
            VERSION: "1.3.0",
            REQUEST: "GetLegendGraphic",
            FORMAT: "image/png",
            LAYER: "temp"
        });
    });
});
