import { describe, expect, it } from "vitest";
import { INITIAL_SELECTION, withChartType, withCompareSensor, withDefaultSensors } from "./analysisSelection";

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

describe("withCompareSensor", () => {
    it("changes only the given half of the compare view", () => {
        const selection = { ...INITIAL_SELECTION, compare: ["a", "b"] as [string, string] };
        expect(withCompareSensor(selection, 1, "c")).toEqual({ ...selection, compare: ["a", "c"] });
        expect(withCompareSensor(selection, 0, "c").compare).toEqual(["c", "b"]);
        expect(selection.compare).toEqual(["a", "b"]);
    });
});

describe("withChartType", () => {
    it("changes only the chart type of the given view", () => {
        expect(withChartType(INITIAL_SELECTION, "single", "bar").charts).toEqual({
            single: "bar",
            compare: ["line", "line"]
        });
        expect(withChartType(INITIAL_SELECTION, 0, "boxplot").charts).toEqual({
            single: "line",
            compare: ["boxplot", "line"]
        });
        expect(withChartType(INITIAL_SELECTION, 1, "windrose").charts).toEqual({
            single: "line",
            compare: ["line", "windrose"]
        });
    });
});
