// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import shippedConfig from "../../../public/config/dataLayers.json?raw";
import { parseDataLayers } from "./types";

describe("parseDataLayers", () => {
    it("accepts the shipped configuration", () => {
        const layers = parseDataLayers(JSON.parse(shippedConfig));
        expect(layers.map((l) => [l.id, l.type])).toEqual([
            ["dwd-icon-t2m", "wms"],
            ["sta-ds-14", "sta-datastream"]
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
});
