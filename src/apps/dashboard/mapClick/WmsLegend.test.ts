import { describe, expect, it } from "vitest";
import { getLegendGraphicUrl, withParams } from "./WmsLegend";

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

describe("withParams", () => {
    it("replaces parameters regardless of their case", () => {
        const url = new URL(withParams("https://example.com/ows?width=20&height=20&layer=a", { WIDTH: "12" }));
        expect(url.searchParams.get("WIDTH")).toBe("12");
        expect(url.searchParams.has("width")).toBe(false);
        expect(url.searchParams.get("height")).toBe("20");
    });
});
