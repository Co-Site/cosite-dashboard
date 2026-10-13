import { describe, expect, it } from "vitest";
import { INITIAL_SELECTION, withDefaultSensors } from "./analysisSelection";

describe("withDefaultSensors", () => {
    it("selects the first sensor (single) and the first two sensors (compare)", () => {
        expect(withDefaultSensors(INITIAL_SELECTION, ["a", "b", "c"])).toEqual({
            ...INITIAL_SELECTION,
            single: "a",
            compare: ["a", "b"]
        });
    });

    it("compares a single sensor with itself", () => {
        expect(withDefaultSensors(INITIAL_SELECTION, ["a"]).compare).toEqual(["a", "a"]);
    });

    it("keeps valid selections and replaces unknown ones", () => {
        const charts = INITIAL_SELECTION.charts;
        const selection = withDefaultSensors({ tab: "compare", single: "c", compare: ["unknown", "c"], charts }, [
            "a",
            "b",
            "c"
        ]);
        expect(selection).toEqual({ tab: "compare", single: "c", compare: ["a", "c"], charts });
    });

    it("selects nothing without sensors", () => {
        expect(withDefaultSensors(INITIAL_SELECTION, [])).toEqual({
            ...INITIAL_SELECTION,
            single: undefined,
            compare: [undefined, undefined]
        });
    });
});
