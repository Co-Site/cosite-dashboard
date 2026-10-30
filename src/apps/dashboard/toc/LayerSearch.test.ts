import { describe, expect, it } from "vitest";
import { searchLayers } from "./LayerSearch";

describe("searchLayers", () => {
    const layer = (name: string, title: string) => ({ name, title });
    const layers = [
        layer("RADOLAN-RX", "Radarreflektivität (RX)"),
        layer("radar_mask", "Maske"),
        layer("RADOLAN-RW", "Angeeichtes Radarkomposit (RW)"),
        layer("T2M", "Temperatur")
    ];
    const names = (query: string) => searchLayers(layers, query).map((l) => l.name);

    it("ranks an exact name first, then title matches, then name matches", () => {
        expect(names("radar")).toEqual(["RADOLAN-RX", "RADOLAN-RW", "radar_mask"]);
        expect(names("radolan-rw")).toEqual(["RADOLAN-RW"]);
        expect(names("t2m")).toEqual(["T2M"]);
    });

    it("returns all layers in document order without a query", () => {
        expect(searchLayers(layers, "  ")).toBe(layers);
    });
});
