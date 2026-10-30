import Feature from "ol/Feature";
import { LineString, Point, Polygon } from "ol/geom";
import { describe, expect, it } from "vitest";
import { colorForId, createWfsStyle, paletteColor, WFS_PALETTE } from "./wfsStyle";

describe("WFS colours", () => {
    it("starts over after the last palette colour", () => {
        expect(paletteColor(0)).toBe(WFS_PALETTE[0]);
        expect(paletteColor(WFS_PALETTE.length + 1)).toBe(WFS_PALETTE[1]);
    });

    it("derives a stable palette colour from the layer id", () => {
        expect(colorForId("districts")).toBe(colorForId("districts"));
        expect(WFS_PALETTE).toContain(colorForId("districts"));
    });
});

describe("createWfsStyle", () => {
    it("styles points, lines and polygons differently", () => {
        const style = createWfsStyle("#2b6cb0");
        const point = style(new Feature(new Point([0, 0])));
        const line = style(
            new Feature(
                new LineString([
                    [0, 0],
                    [1, 1]
                ])
            )
        );
        const polygon = style(
            new Feature(
                new Polygon([
                    [
                        [0, 0],
                        [1, 0],
                        [1, 1],
                        [0, 0]
                    ]
                ])
            )
        );
        expect(point.getImage()).toBeTruthy();
        expect(line.getFill()).toBeNull();
        expect(polygon.getFill()?.getColor()).toBe("rgba(43, 108, 176, 0.2)");
    });
});
