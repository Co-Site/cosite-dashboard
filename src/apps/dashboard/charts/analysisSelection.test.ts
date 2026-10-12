// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { INITIAL_SELECTION, withDefaultSensors } from "./analysisSelection";

describe("withDefaultSensors", () => {
    it("selects the first sensor (single) and the first two sensors (compare)", () => {
        expect(withDefaultSensors(INITIAL_SELECTION, ["a", "b", "c"])).toEqual({
            tab: "single",
            single: "a",
            compare: ["a", "b"]
        });
    });

    it("compares a single sensor with itself", () => {
        expect(withDefaultSensors(INITIAL_SELECTION, ["a"]).compare).toEqual(["a", "a"]);
    });

    it("keeps valid selections and replaces unknown ones", () => {
        const selection = withDefaultSensors(
            { tab: "compare", single: "c", compare: ["unknown", "c"] },
            ["a", "b", "c"]
        );
        expect(selection).toEqual({ tab: "compare", single: "c", compare: ["a", "c"] });
    });

    it("selects nothing without sensors", () => {
        expect(withDefaultSensors(INITIAL_SELECTION, [])).toEqual({
            tab: "single",
            single: undefined,
            compare: [undefined, undefined]
        });
    });
});
