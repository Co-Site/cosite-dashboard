import { describe, expect, it } from "vitest";
import shippedConfig from "../../../public/config/dataLayers.json?raw";
import { parseDataLayers } from "./loadDataLayers";
import { DataLayerNode } from "./types";

type Summary = [string, string] | [string, string, Summary[]];

function summarize(nodes: DataLayerNode[]): Summary[] {
    return nodes.map((node) =>
        node.type === "group" ? [node.id, node.type, summarize(node.layers)] : [node.id, node.type]
    );
}

describe("parseDataLayers", () => {
    it("accepts the shipped configuration", () => {
        const layers = parseDataLayers(JSON.parse(shippedConfig));
        expect(summarize(layers)).toEqual([
            [
                "wms",
                "group",
                [
                    ["dwd-icon-t2m", "wms"],
                    ["dwd-radolan-rw", "wms"]
                ]
            ],
            [
                "leverkusen",
                "group",
                [
                    [
                        "lev-stadtklima",
                        "group",
                        [
                            ["lev-heisse-tage", "wms"],
                            ["lev-sommertage", "wms"],
                            ["lev-tropennaechte", "wms"]
                        ]
                    ],
                    [
                        "lev-hochwasser",
                        "group",
                        [
                            ["lev-hochwasser-dhuenn", "wms"],
                            ["lev-hochwasser-mutzbach", "wms"],
                            ["lev-hochwasser-rhein", "wms"],
                            ["lev-hochwasser-wiembach", "wms"]
                        ]
                    ],
                    [
                        "lev-starkregen",
                        "group",
                        [
                            ["lev-starkregen-t50", "wms"],
                            ["lev-starkregen-t100", "wms"],
                            ["lev-starkregen-hn90", "wms"]
                        ]
                    ],
                    ["lev-grundwassernutzungsverbot", "wms"]
                ]
            ],
            [
                "sta",
                "group",
                [
                    ["sta-ds-14", "sta-datastream"],
                    ["sta-ds-15", "sta-datastream"]
                ]
            ]
        ]);
    });

    it("throws if the layers array is missing", () => {
        expect(() => parseDataLayers({})).toThrowError(/layers/);
        expect(() => parseDataLayers(null)).toThrowError(/layers/);
    });

    it("skips invalid entries and keeps valid ones", () => {
        const layers = parseDataLayers({
            layers: [
                { id: "no-endpoint", type: "sta-datastream", name: "A" },
                { id: "unknown", type: "foo", name: "B", endpoint: "https://example.com" },
                { id: "wms-no-layers", type: "wms", name: "C", endpoint: "https://example.com" },
                { id: "bad-opacity", type: "sta-datastream", name: "D", endpoint: "x", opacity: 2 },
                { id: "ok", type: "sta-datastream", name: "E", endpoint: "https://example.com" },
                { id: "ok", type: "sta-datastream", name: "Duplicate", endpoint: "https://x" }
            ]
        });
        expect(layers.map((l) => l.id)).toEqual(["ok"]);
    });

    it("accepts names and descriptions per language", () => {
        const entry = {
            id: "a",
            type: "sta-datastream",
            endpoint: "https://a",
            name: { de: "Name", en: "Name" },
            description: { de: "Beschreibung", en: "Description" }
        };
        expect(parseDataLayers({ layers: [entry] })).toHaveLength(1);
        expect(parseDataLayers({ layers: [{ ...entry, name: {} }] })).toHaveLength(0);
        expect(parseDataLayers({ layers: [{ ...entry, description: { de: 1 } }] })).toHaveLength(0);
    });

    it("requires names except for WMS layers", () => {
        const wms = { id: "wms", type: "wms", endpoint: "https://example.com", wms: { layers: ["a"] } };
        expect(parseDataLayers({ layers: [wms] })).toHaveLength(1);
        expect(parseDataLayers({ layers: [{ ...wms, name: "" }] })).toHaveLength(0);
        expect(parseDataLayers({ layers: [{ id: "g", type: "group", layers: [] }] })).toHaveLength(0);
        expect(parseDataLayers({ layers: [{ id: "s", type: "sta-datastream", endpoint: "https://x" }] })).toHaveLength(
            0
        );
    });

    it("validates the optional feature info configuration", () => {
        const wms = (featureInfo: unknown) => ({
            id: "wms",
            type: "wms",
            name: "WMS",
            endpoint: "https://example.com",
            wms: { layers: ["a"], featureInfo }
        });
        expect(parseDataLayers({ layers: [wms(undefined)] })).toHaveLength(1);
        expect(parseDataLayers({ layers: [wms({ fields: [{ property: "x", unit: "°C" }] })] })).toHaveLength(1);
        expect(parseDataLayers({ layers: [wms({ format: "application/geo+json" })] })).toHaveLength(1);
        expect(parseDataLayers({ layers: [wms({ enabled: "no" })] })).toHaveLength(0);
        expect(parseDataLayers({ layers: [wms({ format: "" })] })).toHaveLength(0);
        expect(parseDataLayers({ layers: [wms({ fields: [{ label: "x" }] })] })).toHaveLength(0);
    });

    it("validates the optional legend configuration", () => {
        const wms = (legend: unknown) => ({
            id: "wms",
            type: "wms",
            name: "WMS",
            endpoint: "https://example.com",
            wms: { layers: ["a"], legend }
        });
        expect(parseDataLayers({ layers: [wms({ params: { LEGEND_OPTIONS: "columns:3" } })] })).toHaveLength(1);
        expect(parseDataLayers({ layers: [wms({ enabled: false, url: "https://x/legend.png" })] })).toHaveLength(1);
        expect(parseDataLayers({ layers: [wms({ params: { columns: 3 } })] })).toHaveLength(0);
        expect(parseDataLayers({ layers: [wms("yes")] })).toHaveLength(0);
    });

    it("parses nested groups and validates their children", () => {
        const layers = parseDataLayers({
            layers: [
                {
                    id: "outer",
                    type: "group",
                    name: "Outer",
                    layers: [
                        {
                            id: "inner",
                            type: "group",
                            name: "Inner",
                            layers: [
                                {
                                    id: "a",
                                    type: "sta-datastream",
                                    name: "A",
                                    endpoint: "https://a"
                                },
                                { id: "broken", type: "wms", name: "B", endpoint: "https://b" }
                            ]
                        }
                    ]
                },
                { id: "no-children", type: "group", name: "Empty" },
                { id: "a", type: "sta-datastream", name: "Duplicate id", endpoint: "https://c" }
            ]
        });
        expect(summarize(layers)).toEqual([["outer", "group", [["inner", "group", [["a", "sta-datastream"]]]]]]);
    });

    it("resolves relative endpoints against the URL of the app", () => {
        const layers = parseDataLayers(
            {
                layers: [
                    { id: "rel", type: "wms", endpoint: "./proxy/wms", wms: { layers: ["a"] } },
                    { id: "abs", type: "wms", endpoint: "https://example.com/wms", wms: { layers: ["a"] } }
                ]
            },
            "https://host/dashboard/index.html"
        );
        expect(layers.map((layer) => layer.type !== "group" && layer.endpoint)).toEqual([
            "https://host/dashboard/proxy/wms",
            "https://example.com/wms"
        ]);
    });
});
